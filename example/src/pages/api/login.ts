import { withSessionRoute } from "@/utils/withSession"
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd"
import { NextApiRequest, NextApiResponse } from "next"
import { isZupassPublicKey, supportedEvents } from "zuauth"
import { supabase } from "@/lib/supabase"

/**
 * The login checks the validity of the PCD and ensures that the ticket
 * has been issued by Zupass. The watermark used to create the PCD must equal
 * the nonce of the current session.
 * The PCD nullifier is saved to prevent the same PCD from being used for another login.
 */
export default withSessionRoute(async function (req: NextApiRequest, res: NextApiResponse) {
    try {
        if (!req.body.pcd) {
            console.error(`[ERROR] No PCD specified`)
            res.status(400).send("No PCD specified")
            return
        }

        const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(req.body.pcd)

        if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
            console.error(`[ERROR] ZK ticket PCD is not valid`)
            res.status(401).send("ZK ticket PCD is not valid")
            return
        }

        if (!isZupassPublicKey(pcd.claim.signer)) {
            console.error(`[ERROR] PCD is not signed by Zupass`)
            res.status(401).send("PCD is not signed by Zupass")
            return
        }

        if (pcd.claim.watermark.toString() !== req.session.nonce) {
            console.error(`[ERROR] PCD watermark doesn't match`)
            res.status(401).send("PCD watermark doesn't match")
            return
        }

        if (!pcd.claim.nullifierHash) {
            console.error(`[ERROR] PCD ticket nullifier has not been defined`)
            res.status(401).send("PCD ticket nullifer has not been defined")
            return
        }

        const eventId = pcd.claim.partialTicket.eventId

        if (eventId) {
            if (!supportedEvents.includes(eventId)) {
                console.error(`[ERROR] PCD ticket has an unsupported event ID: ${eventId}`)
                res.status(400).send("PCD ticket is not for a supported event")
                return
            }
        } else {
            for (const eventId of pcd.claim.validEventIds ?? []) {
                if (!supportedEvents.includes(eventId)) {
                    console.error(`[ERROR] PCD ticket might have an unsupported event ID: ${eventId}`)
                    res.status(400).send("PCD ticket is not restricted to supported events")
                    return
                }
            }
        }

        // Extract email from the ticket if revealed
        const email = pcd.claim.partialTicket.attendeeEmail
        const ticketId = pcd.claim.nullifierHash

        let user;

        // First try to find user by ticket_id
        const { data: existingUserByTicket } = await supabase
            .from('users')
            .select('*')
            .eq('ticket_id', ticketId)
            .single()

        if (existingUserByTicket) {
            // Update existing user's last login
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({
                    last_login: new Date().toISOString(),
                    metadata: pcd.claim.partialTicket
                })
                .eq('id', existingUserByTicket.id)
                .select()
                .single()

            if (updateError) {
                console.error(`[ERROR] Failed to update existing user: ${updateError.message}`)
                throw updateError
            }
            user = updatedUser
        } else if (email) {
            // If no user found by ticket_id, check by email
            const { data: existingUserByEmail } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single()

            if (existingUserByEmail) {
                // Update existing user with new ticket
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({
                        ticket_id: ticketId,
                        event_id: eventId,
                        last_login: new Date().toISOString(),
                        metadata: pcd.claim.partialTicket
                    })
                    .eq('id', existingUserByEmail.id)
                    .select()
                    .single()

                if (updateError) {
                    console.error(`[ERROR] Failed to update existing user: ${updateError.message}`)
                    throw updateError
                }
                user = updatedUser
            } else {
                // Create new user if neither ticket_id nor email exists
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({
                        ticket_id: ticketId,
                        event_id: eventId,
                        email: email,
                        last_login: new Date().toISOString(),
                        metadata: pcd.claim.partialTicket
                    })
                    .select()
                    .single()

                if (createError) {
                    console.error(`[ERROR] Failed to create new user: ${createError.message}`)
                    throw createError
                }
                user = newUser
            }
        } else {
            // Handle case where no email is provided
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    ticket_id: ticketId,
                    event_id: eventId,
                    last_login: new Date().toISOString(),
                    metadata: pcd.claim.partialTicket
                })
                .select()
                .single()

            if (createError) {
                console.error(`[ERROR] Failed to create new user: ${createError.message}`)
                throw createError
            }
            user = newUser
        }

        // Save the ticket's data and Supabase user ID
        req.session.user = {
            ...pcd.claim.partialTicket,
            id: user.id
        }

        await req.session.save()
        res.status(200).send({ user: req.session.user })
    } catch (error: any) {
        console.error(`[ERROR] ${error}`)
        res.status(500).send(`Unknown error: ${error.message}`)
    }
})
