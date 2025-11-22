import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface ShareModalProps {
    eventUrl: string;
    eventName: string;
    onClose: () => void;
}

export default function ShareModal({ eventUrl, eventName, onClose }: ShareModalProps) {
    const [qrSrc, setQrSrc] = useState('');

    useEffect(() => {
        QRCode.toDataURL(eventUrl).then(setQrSrc);
    }, [eventUrl]);

    const whatsappLink = `https://wa.me/?text=Watch Live: ${eventName} - ${eventUrl}`;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white text-black p-8 rounded-lg max-w-sm w-full text-center relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-black">X</button>

                <h3 className="text-xl font-bold mb-4">Share Event</h3>

                {qrSrc && <img src={qrSrc} alt="QR Code" className="mx-auto mb-4 w-48 h-48" />}

                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600 mb-2"
                >
                    Share on WhatsApp
                </a>

                <div className="bg-gray-100 p-2 rounded text-sm break-all">
                    {eventUrl}
                </div>
            </div>
        </div>
    );
}
