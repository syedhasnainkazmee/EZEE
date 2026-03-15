// Quick email test script — run with: npx tsx scripts/test-emails.ts
import {
  sendReviewEmail,
  sendTaskAssignedEmail,
  sendTaskInReviewEmail,
  sendFinalApprovalEmail,
  sendChangesRequestedEmail,
  sendWelcomeEmail,
} from '../src/lib/email'

const TO = 'hasnain.kazmee@sunhub.com'
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

async function run() {
  console.log('Sending test emails to', TO, '...\n')

  // 1. Invitation-style: Welcome email (fires on accept-invite)
  console.log('1. Welcome email...')
  await sendWelcomeEmail({ to: TO, name: 'Hasnain', orgName: 'Sunhub' })
  console.log('   done\n')

  // 2. Review request email (fires when submission enters review, step 1)
  console.log('2. Review request email (step 1 of 3)...')
  await sendReviewEmail({
    to: TO,
    reviewerName: 'Hasnain',
    reviewerRole: 'member',
    reviewerFocus: 'Check brand consistency — logo usage, brand colors, and typography',
    submissionTitle: 'Summer Campaign Designs',
    reviewToken: 'test-token-abc123',
    step: 1,
    totalSteps: 3,
  })
  console.log('   done\n')

  // 3. Review request email (chained — step 2 with previous approver)
  console.log('3. Review request email (step 2 of 3, with previous approver)...')
  await sendReviewEmail({
    to: TO,
    reviewerName: 'Hasnain',
    reviewerRole: 'admin',
    reviewerFocus: 'Final approval — overall sign-off',
    submissionTitle: 'Summer Campaign Designs',
    reviewToken: 'test-token-xyz789',
    step: 2,
    totalSteps: 3,
    previousApprover: 'Minhal',
  })
  console.log('   done\n')

  // 4. Task assigned email
  console.log('4. Task assigned email...')
  await sendTaskAssignedEmail({
    to: TO,
    assigneeName: 'Hasnain',
    assignorName: 'Daniyal',
    taskTitle: 'Prepare Q3 Social Media Assets',
    projectName: 'Sunhub Brand Refresh',
  })
  console.log('   done\n')

  // 5. Task in review email (restyled)
  console.log('5. Task in review email...')
  await sendTaskInReviewEmail({
    to: TO,
    assigneeName: 'Hasnain',
    taskTitle: 'Prepare Q3 Social Media Assets',
    submissionTitle: 'Summer Campaign Designs',
  })
  console.log('   done\n')

  // 6. Changes requested email
  console.log('6. Changes requested email...')
  await sendChangesRequestedEmail({
    to: TO,
    recipientName: 'Hasnain',
    submissionTitle: 'Summer Campaign Designs',
    reviewerName: 'Meeran',
    comment: 'The logo placement on slide 3 is too close to the edge. Please adjust safe margins and recheck the brand color palette.',
    submissionUrl: `${BASE}/submission/test-123`,
  })
  console.log('   done\n')

  // 7. Final approval email
  console.log('7. Final approval email...')
  await sendFinalApprovalEmail({
    to: TO,
    submissionTitle: 'Summer Campaign Designs',
    submissionUrl: `${BASE}/submission/test-123`,
  })
  console.log('   done\n')

  console.log('All emails sent. Check your inbox!')
}

run().catch(console.error)
