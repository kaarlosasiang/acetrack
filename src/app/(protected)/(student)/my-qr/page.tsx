import IDCard from "./IDCard";

export default function MyQRPage() {
  return (
    <div className="flex flex-col items-center">
      <h1>My QR Code</h1>
      <p>This is the QR code page for students.</p>

      <IDCard />
    </div>
  );
}
