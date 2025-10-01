import { StudentQRGenerator } from '@/components/custom/StudentQRGenerator';

export default function QRGeneratorPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-4 mb-6">
        <h1 className="text-3xl font-bold">QR Code Generator</h1>
        <p className="text-muted-foreground">
          Generate QR codes for students to use with the attendance scanner.
        </p>
      </div>
      
      <StudentQRGenerator />
    </div>
  );
}
