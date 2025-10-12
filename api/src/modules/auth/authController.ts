import logger from '@/shared/utils/logger';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import authService from './authService';

const authController = {
  /**
   * Register a new user
   */
  register: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { firstName, lastName, email, password, phone } = req.body;

      const result = await authService.register({
        firstName,
        lastName,
        email,
        password,
        phone,
      });

      logger.info(`User registered successfully: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify your email.',
        data: result,
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  },

  /**
   * Login user
   */
  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { email, password } = req.body;

      const result = await authService.login(email, password);

      logger.info(`User logged in successfully: ${email}`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(error);
    }
  },

  /**
   * Logout user
   */
  logout: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  },

  /**
   * Verify email
   */
  verifyEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
        return;
      }

      await authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      next(error);
    }
  },

  /**
   * Request password reset
   */
  forgotPassword: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { email } = req.body;

      await authService.forgotPassword(email);

      res.status(200).json({
        success: true,
        message: 'Password reset instructions sent to your email',
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      next(error);
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { token } = req.params;
      const { password } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Reset token is required',
        });
        return;
      }

      await authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      next(error);
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const user = await authService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  },
};

export default authController;
