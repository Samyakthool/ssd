// ==========================================================================
// SAMATA SAINIK DAL (SSD) - RATE LIMITING & ABUSE MITIGATION ENGINE
// ==========================================================================

import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test' || !!process.env.RUNNING_TESTS;

// 1. Strict Limiter for Login Endpoint (Prevent Brute-Force & Credential Stuffing)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 15, // Limit each IP to 15 login requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
  }
});

// 2. Public Membership Application Submission Limiter (Anti-Spam)
export const applicationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 1000 : 20, // 20 applications per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Submission rate limit reached. Please wait before submitting additional enlistment applications.'
  }
});

// 3. Donation Order Creation Limiter (Anti-Carding & Bot Defense)
export const donationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many donation order attempts. Please try again shortly.'
  }
});

// 4. Global API Gateway Rate Limiter
export const globalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 5000 : 400, // 400 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path.startsWith('/uploads') || req.path === '/api/health';
  },
  message: {
    success: false,
    error: 'Global API rate limit exceeded. Please throttle your client requests.'
  }
});
