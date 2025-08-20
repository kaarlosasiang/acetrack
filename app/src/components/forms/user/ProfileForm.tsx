'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, User } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUpload } from '@/components/avatar';

import userService from '@/lib/services/UserService';
import type { UserProfile } from '@/lib/types/Database';
import CloudinaryService from '@/lib/services/CloudinaryService';

// Profile form schema
const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_initial: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: UserProfile;
  onSuccess?: (updatedProfile: UserProfile) => void;
}

export function ProfileForm({ profile, onSuccess }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile.first_name,
      middle_initial: profile.middle_initial || '',
      last_name: profile.last_name,
      email: profile.email,
      username: profile.username,
    },
  });

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
    toast.success('Avatar updated successfully');
  };

  const handleAvatarError = (error: Error) => {
    console.error('Avatar upload failed:', error);
    toast.error('Failed to update avatar');
  };

  const handleAvatarRemove = async () => {
    try {
      setIsAvatarUploading(true);
      await userService.removeAvatar(profile.student_id);
      setAvatarUrl(null);
      toast.success('Avatar removed successfully');
    } catch (error) {
      console.error('Avatar removal failed:', error);
      toast.error('Failed to remove avatar');
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      
      const updatedProfile = await userService.updateProfile(profile.student_id, {
        first_name: data.first_name,
        middle_initial: data.middle_initial || null,
        last_name: data.last_name,
        email: data.email,
        username: data.username,
      });

      toast.success('Profile updated successfully');
      onSuccess?.(updatedProfile);
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayAvatarUrl = () => {
    if (avatarUrl) {
      return CloudinaryService.getOptimizedAvatarUrl(avatarUrl, 'lg');
    }
    return CloudinaryService.getDefaultAvatarUrl(
      `${form.watch('first_name')} ${form.watch('last_name')}`
    );
  };

  const getUserInitials = () => {
    return CloudinaryService.getUserInitials(
      form.watch('first_name') || profile.first_name,
      form.watch('last_name') || profile.last_name
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Picture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage 
                src={getDisplayAvatarUrl()} 
                alt={`${profile.first_name} ${profile.last_name}`} 
              />
              <AvatarFallback className="text-lg">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                userId={profile.student_id}
                userName={`${profile.first_name} ${profile.last_name}`}
                size="lg"
                onAvatarUpdate={handleAvatarUpdate}
                onError={handleAvatarError}
                editable={true}
                showUploadButton={true}
              />
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAvatarRemove}
                  disabled={isAvatarUploading}
                >
                  {isAvatarUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Remove Avatar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="middle_initial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Initial</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="M.I." 
                          maxLength={1}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Profile
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
