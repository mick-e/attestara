"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg border border-navy-800 bg-navy-900 p-0 text-white backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between border-b border-navy-800 px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          {"\u2715"}
        </button>
      </div>
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="border-t border-navy-800 px-6 py-4">{footer}</div>
      )}
    </dialog>
  );
}
