import { supabase } from "../config/supabase";
import type { Course, CourseInsert } from "../types/Database";

const courseService = {
  /**
   * Get all courses
   */
  async getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("course_name");

    if (error) throw error;
    return data || [];
  },

  /**
   * Get course by ID
   */
  async getCourse(courseId: number): Promise<Course | null> {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  /**
   * Create a new course
   */
  async createCourse(courseData: Omit<CourseInsert, "id">) {
    const { data, error } = await supabase
      .from("courses")
      .insert(courseData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a course
   */
  async updateCourse(courseId: number, updates: Partial<Course>) {
    const { data, error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", courseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get course ID by course abbreviation/value
   */
  async getCourseIdByValue(courseValue: string): Promise<number | null> {
    // Map course abbreviations to course names
    const courseNameMap: { [key: string]: string } = {
      "BSCE": "Bachelor of Civil Engineering",
      "BIT": "Bachelor of Information Technology",
    };

    const courseName = courseNameMap[courseValue];
    if (!courseName) return null;

    const { data, error } = await supabase
      .from("courses")
      .select("id")
      .eq("course_name", courseName)
      .single();

    if (error) {
      // If course doesn't exist, create it
      if (error.code === "PGRST116") {
        const newCourse = await this.createCourse({ course_name: courseName });
        return newCourse.id;
      }
      throw error;
    }
    
    return data?.id || null;
  },

  /**
   * Delete a course
   */
  async deleteCourse(courseId: number) {
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (error) throw error;
  },
};

export default courseService;
