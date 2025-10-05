import { BookOpen, Calendar, GraduationCap, Users } from "lucide-react";

export default function IconsBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Scattered arrangement for visual appeal */}

      {/* Top area icons */}
      <div className="absolute top-16 right-24">
        <GraduationCap className="w-20 h-20 text-gray-100 transform rotate-15" />
      </div>

      <div className="absolute top-32 left-20">
        <BookOpen className="w-16 h-16 text-gray-100 transform -rotate-12" />
      </div>

      <div className="absolute top-12 left-1/3">
        <Calendar className="w-14 h-14 text-gray-300 transform rotate-8" />
      </div>

      {/* Middle area icons */}
      <div className="absolute top-1/2 right-16 transform -translate-y-8">
        <Users className="w-18 h-18 text-gray-100 transform -rotate-20" />
      </div>

      <div className="absolute top-1/2 left-16 transform translate-y-4">
        <Calendar className="w-12 h-12 text-gray-100 transform rotate-25" />
      </div>

      <div className="absolute top-1/3 right-1/4">
        <BookOpen className="w-15 h-15 text-gray-100 transform rotate-45" />
      </div>

      {/* Bottom area icons */}
      <div className="absolute bottom-20 left-32">
        <GraduationCap className="w-22 h-22 text-gray-100 transform -rotate-8" />
      </div>

      <div className="absolute bottom-32 right-20">
        <Users className="w-16 h-16 text-gray-100 transform rotate-12" />
      </div>

      <div className="absolute bottom-16 left-2/3">
        <Calendar className="w-18 h-18 text-gray-100 transform -rotate-15" />
      </div>

      {/* Accent scattered icons */}
      <div className="absolute top-2/3 left-1/4">
        <BookOpen className="w-10 h-10 text-gray-100 transform rotate-60" />
      </div>

      <div className="absolute top-1/4 right-1/3">
        <Users className="w-12 h-12 text-gray-100 transform -rotate-30" />
      </div>

      <div className="absolute bottom-1/3 right-1/4">
        <GraduationCap className="w-14 h-14 text-gray-100 transform rotate-35" />
      </div>
    </div>
  );
}
