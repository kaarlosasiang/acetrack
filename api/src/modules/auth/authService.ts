import config from '@/config';
import { User } from '@/models/User';
import { AppError } from '@/shared/utils/appError';
import logger from '@/shared/utils/logger';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { IUser } from '../../shared/interfaces/IUser';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: Date | undefined;
}

export interface AuthResponse {
  user: Omit<IUser, 'password'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

const authService = {
  /**
   * Register a new user
   */
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }

      // Create new user
      const user = new User({
        ...userData,
        emailVerificationToken: authService.generateEmailVerificationToken(),
      });

      await user.save();

      // Generate tokens
      const tokens = authService.generateTokens(user._id);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      // TODO: Send verification email
      // await this.sendVerificationEmail(user.email, user.emailVerificationToken);

      logger.info(`New user registered: ${user.email}`);

      return {
        user: userResponse,
        ...tokens,
      };
    } catch (error) {
      logger.error('Registration service error:', error);
      throw error;
    }
  },

  /**
   * Login user
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new AppError('Account is not active. Please contact support.', 401);
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const tokens = authService.generateTokens(user._id);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      logger.info(`User logged in: ${user.email}`);

      return {
        user: userResponse,
        ...tokens,
      };
    } catch (error) {
      logger.error('Login service error:', error);
      throw error;
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string };

      // Find user
      const user = await User.findById(decoded.id);
      if (!user || user.status !== 'active') {
        throw new AppError('Invalid refresh token', 401);
      }

      // Generate new tokens
      const tokens = authService.generateTokens(user._id);

      logger.info(`Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      logger.error('Token refresh service error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      }
      throw error;
    }
  },

  /**
   * Logout user (invalidate refresh token)
   */
  logout: async (refreshToken: string): Promise<void> => {
    try {
      // TODO: Implement token blacklisting if needed
      // For now, we'll just log the logout
      logger.info('User logged out');
    } catch (error) {
      logger.error('Logout service error:', error);
      throw error;
    }
  },

  /**
   * Verify email
   */
  verifyEmail: async (token: string): Promise<void> => {
    try {
      const user = await User.findOne({ emailVerificationToken: token });

      if (!user) {
        throw new AppError('Invalid or expired verification token', 400);
      }

      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      await user.save();

      logger.info(`Email verified for user: ${user.email}`);
    } catch (error) {
      logger.error('Email verification service error:', error);
      throw error;
    }
  },

  /**
   * Forgot password
   */
  forgotPassword: async (email: string): Promise<void> => {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists or not
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // TODO: Send reset password email
      // await this.sendPasswordResetEmail(user.email, resetToken);

      logger.info(`Password reset token generated for user: ${user.email}`);
    } catch (error) {
      logger.error('Forgot password service error:', error);
      throw error;
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    try {
      // Hash the token to compare with stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.info(`Password reset successful for user: ${user.email}`);
    } catch (error) {
      logger.error('Reset password service error:', error);
      throw error;
    }
  },

  /**
   * Get user profile
   */
  getUserProfile: async (userId: string): Promise<IUser> => {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return user;
    } catch (error) {
      logger.error('Get user profile service error:', error);
      throw error;
    }
  },

  /**
   * Generate JWT tokens
   */
  generateTokens: (userId: Types.ObjectId): TokenResponse => {
    const payload = { id: userId.toString() };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessExpiresIn,
    };
  },

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken: (): string => {
    return crypto.randomBytes(32).toString('hex');
  },
};

export default authService;
