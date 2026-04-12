-- AlterTable
ALTER TABLE `users` ADD COLUMN `onboardingCompleted` BOOLEAN NOT NULL DEFAULT false;

-- Set all EXISTING users as already onboarded (so they don't get redirected)
UPDATE `users` SET `onboardingCompleted` = 1;
