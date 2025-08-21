"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeGenerator } from '@/components/custom/QRCodeGenerator';
import { Download, User, QrCode } from 'lucide-react';

interface StudentData {
  student_id: string;
  firstname: string;
  middlename?: string;
  lastname: string;
  course_id: string;
  year_level: string;
  avatar?: string;
}

export function StudentQRGenerator() {
  const [studentData, setStudentData] = useState<StudentData>({
    student_id: '',
    firstname: '',
    middlename: '',
    lastname: '',
    course_id: '',
    year_level: '',
    avatar: ''
  });

  const [qrValue, setQrValue] = useState('');

  const handleInputChange = (field: keyof StudentData, value: string) => {
    const updatedData = { ...studentData, [field]: value };
    setStudentData(updatedData);
    
    // Generate QR code value
    if (updatedData.student_id && updatedData.firstname && updatedData.lastname && updatedData.course_id && updatedData.year_level) {
      const qrData = JSON.stringify({
        student_id: updatedData.student_id,
        firstname: updatedData.firstname,
        middlename: updatedData.middlename || undefined,
        lastname: updatedData.lastname,
        course_id: updatedData.course_id,
        year_level: updatedData.year_level,
        avatar: updatedData.avatar || undefined
      });
      setQrValue(qrData);
    } else {
      setQrValue('');
    }
  };

  const downloadQR = async () => {
    if (!qrValue) return;

    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `student-qr-${studentData.student_id}.png`;
        link.href = url;
        link.click();
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Student QR Code Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="student_id">Student ID *</Label>
                <Input
                  id="student_id"
                  placeholder="e.g., 2024-001"
                  value={studentData.student_id}
                  onChange={(e) => handleInputChange('student_id', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstname">First Name *</Label>
                  <Input
                    id="firstname"
                    placeholder="John"
                    value={studentData.firstname}
                    onChange={(e) => handleInputChange('firstname', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastname">Last Name *</Label>
                  <Input
                    id="lastname"
                    placeholder="Doe"
                    value={studentData.lastname}
                    onChange={(e) => handleInputChange('lastname', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="middlename">Middle Name</Label>
                <Input
                  id="middlename"
                  placeholder="Smith"
                  value={studentData.middlename}
                  onChange={(e) => handleInputChange('middlename', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course_id">Course ID *</Label>
                  <Input
                    id="course_id"
                    placeholder="1"
                    type="number"
                    value={studentData.course_id}
                    onChange={(e) => handleInputChange('course_id', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="year_level">Year Level *</Label>
                  <Select value={studentData.year_level} onValueChange={(value) => handleInputChange('year_level', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st Year</SelectItem>
                      <SelectItem value="2nd">2nd Year</SelectItem>
                      <SelectItem value="3rd">3rd Year</SelectItem>
                      <SelectItem value="4th">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  placeholder="https://example.com/avatar.jpg"
                  value={studentData.avatar}
                  onChange={(e) => handleInputChange('avatar', e.target.value)}
                />
              </div>
            </div>

            {/* QR Code Section */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-4">Generated QR Code</h3>
                {qrValue ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <QRCodeGenerator
                        value={qrValue}
                        size={200}
                        errorCorrectionLevel="M"
                        className="border rounded-lg p-4 bg-white"
                      />
                    </div>
                    <Button 
                      onClick={downloadQR} 
                      className="flex items-center gap-2"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      Download QR Code
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Fill in the required fields to generate QR code</p>
                    <p className="text-sm mt-2">Fields marked with * are required</p>
                  </div>
                )}
              </div>

              {qrValue && (
                <div className="space-y-2">
                  <Label>QR Code Data (JSON):</Label>
                  <div className="p-3 bg-muted rounded-lg text-sm font-mono break-all">
                    {qrValue}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">For Administrators:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Fill in student information in the form</li>
                <li>Click "Download QR Code" to save the image</li>
                <li>Print or share the QR code with the student</li>
                <li>Each student should have their unique QR code</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">For Students:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Save the QR code image on your device</li>
                <li>Present the QR code at event check-in</li>
                <li>Scanner will automatically record your attendance</li>
                <li>Keep your QR code accessible during events</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentQRGenerator;
