
import React from 'react';

interface ReceiptProps {
  title: string;
  details: {
    date: string;
    time: string;
    item: string;
    amount: number;
    paymentMethod?: string;
    clientName?: string;
  };
  items?: { name: string; quantity: number; price: number }[];
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>((props, ref) => {
  const { title, details, items } = props;

  return (
    <div ref={ref} className="p-4 bg-white text-black text-sm font-mono">
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">Coworking Caisse</h1>
        <p className="text-xs">Receipt</p>
      </div>
      <div className="mb-4">
        <p><strong>Date:</strong> {details.date}</p>
        <p><strong>Time:</strong> {details.time}</p>
        {details.clientName && <p><strong>Client:</strong> {details.clientName}</p>}
      </div>
      <div className="border-t border-b border-dashed border-black py-2 mb-4">
        <h2 className="text-center font-bold mb-2">{title}</h2>
        {items ? (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="text-left">{item.name}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">{item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p><strong>Service:</strong> {details.item}</p>
        )}
      </div>
      <div className="text-right mb-4">
        <p><strong>Total:</strong> {details.amount.toFixed(2)} DH</p>
        {details.paymentMethod && <p className="text-xs">Paid by: {details.paymentMethod}</p>}
      </div>
      <div className="text-center text-xs">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
});
