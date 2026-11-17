"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, QrCode, Share2, Check } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export default function QRCodeModal({ isOpen, onClose, title, url }: QRCodeModalProps) {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && url) {
      QRCode.toDataURL(url, { width: 260, margin: 2 })
        .then((dataUrl) => setQrSrc(dataUrl))
        .catch((err) => console.error("Error generating QR:", err));
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Share on Campus</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            Scan to view &quot;{title}&quot; or print for your college notice board!
          </p>

          <div className="my-5 p-3 bg-gray-50 rounded-xl inline-block border border-gray-200">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc} alt="Listing QR Code" className="w-56 h-56 mx-auto rounded-lg" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-gray-400">
                Generating QR...
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Link Copied!" : "Copy Listing Link"}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
