#!/usr/bin/env node

/**
 * Production Issue Diagnostic Script
 *
 * This script helps identify and fix common production issues with Habistat,
 * particularly around authentication and environment configuration.
 *
 * Run with: bun run scripts/fix-production-issues.mjs
 */

import { readFileSync, existsSync } from 'fs';

console.log('🔍 Habistat Production Diagnostic Tool\n');

// Check environment files
function checkEnvironmentFiles() {
  console.log('📋 Environment Configuration Check');
  console.log('─'.repeat(40));

  const envFiles = ['.env', '.env.local', '.env.production'];
  const envExample = '.env.example';

  if (existsSync(envExample)) {
    console.log('✅ .env.example found');
    const exampleContent = readFileSync(envExample, 'utf8');
    console.log('   Required variables in example:');
    const requiredVars = exampleContent.match(/^[A-Z_]+=.*/gm) || [];
    requiredVars.forEach(line => {
      const varName = line.split('=')[0];
      console.log(`   - ${varName}`);
    });
  } else {
    console.log('❌ .env.example not found');
  }

  console.log('\n📁 Environment Files Check:');
  envFiles.forEach(file => {
    if (existsSync(file)) {
      console.log(`✅ ${file} found`);
      const content = readFileSync(file, 'utf8');

      // Check for key variables
      const hasClerkSecret = content.includes('CLERK_SECRET_KEY=');
      const hasPublicClerk = content.includes('PUBLIC_CLERK_PUBLISHABLE_KEY=');
      const hasConvexUrl = content.includes('VITE_CONVEX_URL=');
      const hasOldClerkVar = content.includes('VITE_CLERK_PUBLISHABLE_KEY=');

      console.log(`   - CLERK_SECRET_KEY: ${hasClerkSecret ? '✅' : '❌'}`);
      console.log(`   - PUBLIC_CLERK_PUBLISHABLE_KEY: ${hasPublicClerk ? '✅' : '❌'}`);
      console.log(`   - VITE_CONVEX_URL: ${hasConvexUrl ? '✅' : '❌'}`);

      if (hasOldClerkVar) {
        console.log('   ⚠️  Found deprecated VITE_CLERK_PUBLISHABLE_KEY - should be PUBLIC_CLERK_PUBLISHABLE_KEY');
      }
    } else {
      console.log(`❌ ${file} not found`);
    }
  });
}

// Check package.json and dependencies
function checkDependencies() {
  console.log('\n📦 Dependencies Check');
  console.log('─'.repeat(40));

  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const clerkVersion = pkg.dependencies?.['@clerk/sveltekit'] || pkg.dependencies?.['svelte-clerk'];
    const convexVersion = pkg.dependencies?.['convex'];

    console.log('✅ package.json found');
    console.log(`   - Clerk version: ${clerkVersion || 'Not found'}`);
    console.log(`   - Convex version: ${convexVersion || 'Not found'}`);

    if (!clerkVersion) {
      console.log('❌ No Clerk dependency found');
    }
    if (!convexVersion) {
      console.log('❌ No Convex dependency found');
    }
  } else {
    console.log('❌ package.json not found');
  }
}

// Generate deployment checklist
function generateDeploymentChecklist() {
  console.log('\n📝 Production Deployment Checklist');
  console.log('─'.repeat(40));

  const checklist = [
    'Environment Variables:',
    '  □ Set PUBLIC_CLERK_PUBLISHABLE_KEY in production environment',
    '  □ Set CLERK_SECRET_KEY in production environment (keep secure)',
    '  □ Set VITE_CONVEX_URL to your production Convex URL',
    '  □ Set CLERK_JWT_ISSUER_DOMAIN in Convex dashboard',
    '',
    'Clerk Configuration:',
    '  □ Create "convex" JWT template in Clerk dashboard',
    '  □ Set correct issuer domain in template',
    '  □ Verify domain allowlist includes your production domain',
    '',
    'Convex Configuration:',
    '  □ Deploy Convex functions: bun exec convex deploy',
    '  □ Set CLERK_JWT_ISSUER_DOMAIN environment variable in Convex',
    '  □ Verify authentication is working in Convex dashboard',
    '',
    'Testing:',
    '  □ Test /api/auth/token endpoint returns 200',
    '  □ Test /api/auth/check endpoint shows signed in status',
    '  □ Verify app loads without infinite loading screen',
    '  □ Test auth flow from sign-in to app functionality',
    '',
    'Debug Tools:',
    '  □ Use /debug/auth page to verify all components',
    '  □ Check browser console for authentication errors',
    '  □ Verify network requests to auth endpoints'
  ];

  checklist.forEach(item => console.log(item));
}

// Production fixes
function suggestFixes() {
  console.log('\n🔧 Common Production Fixes');
  console.log('─'.repeat(40));

  console.log('1. Environment Variable Migration:');
  console.log('   If using old VITE_CLERK_PUBLISHABLE_KEY:');
  console.log('   - Rename to PUBLIC_CLERK_PUBLISHABLE_KEY');
  console.log('   - Update all environment files (.env, .env.production, etc.)');
  console.log('   - Redeploy application');

  console.log('\n2. Authentication Timeout Issues:');
  console.log('   - Check if Clerk service is reachable');
  console.log('   - Verify JWT template is correctly configured');
  console.log('   - Use browser dev tools to check for CORS issues');

  console.log('\n3. Infinite Loading Screen:');
  console.log('   - Navigate to /debug/auth to see detailed status');
  console.log('   - Check if initialization is hanging on specific component');
  console.log('   - Use "Continue in offline mode" if auth is broken');

  console.log('\n4. Manual Testing Commands:');
  console.log('   - Test token endpoint: curl -X GET <your-domain>/api/auth/token');
  console.log('   - Test auth check: curl -X GET <your-domain>/api/auth/check');
  console.log('   - Redeploy Convex: bun exec convex deploy');
}

// Run all checks
async function runDiagnostics() {
  checkEnvironmentFiles();
  checkDependencies();
  generateDeploymentChecklist();
  suggestFixes();

  console.log('\n🎯 Next Steps');
  console.log('─'.repeat(40));
  console.log('1. Fix any ❌ issues found above');
  console.log('2. Update environment variables in production');
  console.log('3. Redeploy application and Convex functions');
  console.log('4. Test using /debug/auth page');
  console.log('5. Monitor production logs for authentication errors');

  console.log('\n✨ Diagnostic complete!');
}

// Run the diagnostics
runDiagnostics().catch(console.error);