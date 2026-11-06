export const DEV = process.env.NODE_ENV != 'production';
export const E2E = process.env.NODE_ENV == 'e2e';

export const BACKEND_DOMAIN = DEV
  ? 'http://localhost:3000'
  : 'https://api.mindswithwings.com';

export const REDIRECT_URI = BACKEND_DOMAIN + '/auth';
export const COGNITO_BASE_URI = DEV
  ? 'https://us-east-1rt1sb3rfe.auth.us-east-1.amazoncognito.com'
  : 'https://us-east-17bvoomwr4.auth.us-east-1.amazoncognito.com';

export const WEBSITE_URI = DEV
  ? 'http://localhost:5173'
  : 'https://mindswithwings.com';

export const S3_BASE_PATH = DEV ? 'webdata/dev' : 'webdata/prod';
export const S3_BUCKET = 'lessonresources-6a27ce93';

export const MORE_ENV_FILE = DEV ? '.env.local' : '.env';
