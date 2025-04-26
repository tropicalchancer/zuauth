import { useEffect, useState } from 'react';

export default function PopupHandler() {
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.opener) {
      setError('Not a popup window');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const proofUrl = params.get('proofUrl');
    const proof = params.get('proof');
    const finished = params.get('finished');

    if (proofUrl) {
      // Redirect to Zupass
      window.location.href = proofUrl;
    } else if (finished && proof) {
      // Send proof back to parent window
      window.opener.postMessage({ encodedPCD: proof }, '*');
      window.close();
    }
  }, []);

  return <div>{error}</div>;
} 