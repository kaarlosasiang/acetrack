export interface RegisterFormData {
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  course_id: number;
  year_level: number;
  password: string;
  confirmPassword: string;
}

export interface RegisterData extends RegisterFormData {
  username: string;
}