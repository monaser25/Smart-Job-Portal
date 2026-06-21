<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Application\ApplicationController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Company\ATSController;
use App\Http\Controllers\Company\CompanyDashboardController;
use App\Http\Controllers\Company\CompanyJobController;
use App\Http\Controllers\Company\CompanyProfileController;
use App\Http\Controllers\CV\CVController;
use App\Http\Controllers\Job\JobController;
use App\Http\Controllers\Job\JobRecommendationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Profile\ProfileController;
use App\Http\Controllers\Public\PublicCompanyController;
use App\Http\Controllers\Public\PublicJobController;
use App\Http\Controllers\Public\PublicSettingController;
use App\Http\Controllers\Seeker\SavedJobController;
use App\Http\Controllers\Skill\SkillController;
use App\Http\Controllers\MessageController;
use Illuminate\Support\Facades\Route;

// ── PUBLIC (no auth required) ─────────────────────────────
Route::prefix('public')->group(function () {
    Route::get('jobs',                [PublicJobController::class, 'index']);
    Route::get('jobs/{job}',          [PublicJobController::class, 'show']);
    Route::get('companies',           [PublicCompanyController::class, 'index']);
    Route::get('companies/{company}', [PublicCompanyController::class, 'show']);
    Route::get('skills',              [SkillController::class, 'index']);
    Route::get('contact-info',        [PublicSettingController::class, 'contactInfo']);
});

// ── AUTH (public, throttled) ──────────────────────────────
Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('register',            [AuthController::class, 'register']);
    Route::post('login',               [AuthController::class, 'login']);
    Route::get('verify-email',         [AuthController::class, 'verifyEmail']);
    Route::post('resend-verification', [AuthController::class, 'resendVerification']);
    Route::post('forgot-password',     [PasswordResetController::class, 'sendLink']);
    Route::post('reset-password',      [PasswordResetController::class, 'reset']);
});

// ── AUTHENTICATED ─────────────────────────────────────────
Route::middleware(['auth:sanctum', 'verified', 'ban.check'])->group(function () {

    // Auth session
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me',      [AuthController::class, 'me']);

    // Shared lookups (auth users)
    Route::get('skills',       [SkillController::class, 'index']);
    Route::get('jobs',         [JobController::class, 'index']);
    Route::get('jobs/{job}',   [JobController::class, 'show']);
    Route::post('jobs/{job}/view', [JobController::class, 'recordView']);

    // Notifications (seeker + company)
    Route::get('notifications',              [NotificationController::class, 'index']);
    Route::patch('notifications/{id}/read',  [NotificationController::class, 'markRead']);
    Route::post('notifications/read-all',    [NotificationController::class, 'markAllRead']);

    // Messages (seeker + company)
    Route::get('messages',                   [MessageController::class, 'conversations']);
    Route::get('messages/{user_id}',         [MessageController::class, 'show']);
    Route::post('messages',                  [MessageController::class, 'store']);
    Route::patch('messages/{user_id}/read',  [MessageController::class, 'markRead']);
    Route::delete('messages/{user_id}',       [MessageController::class, 'destroyConversation']);

    // ── JOB SEEKER ──────────────────────────────────────
    Route::middleware('role:job_seeker')->group(function () {

        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/avatar', [ProfileController::class, 'uploadAvatar']);
        Route::post('profile/cover', [ProfileController::class, 'uploadCover']);
        Route::post('profile/verify-password', [ProfileController::class, 'verifyPassword']);
        Route::put('profile/settings', [ProfileController::class, 'updateSettings']);

        Route::middleware('throttle:cv_upload')
             ->post('cv/upload', [CVController::class, 'upload']);
        Route::get('cv/status',  [CVController::class, 'status']);
        Route::get('cv/parsed',  [CVController::class, 'getParsed']);
        Route::put('cv/parsed',  [CVController::class, 'updateParsed']);

        Route::post('seeker/skills',              [SkillController::class, 'addToSeeker']);
        Route::delete('seeker/skills/{skill_id}', [SkillController::class, 'removeFromSeeker']);

        // Saved jobs
        Route::get('seeker/saved-jobs',          [SavedJobController::class, 'index']);
        Route::post('seeker/saved-jobs/{job}',   [SavedJobController::class, 'store']);
        Route::delete('seeker/saved-jobs/{job}', [SavedJobController::class, 'destroy']);

        // Recommended MUST come before {job} wildcard (or use a different prefix)
        Route::middleware('cv.uploaded')
            ->get('seeker/jobs/recommended', [JobRecommendationController::class, 'index']);

        Route::get('applications',               [ApplicationController::class, 'index']);
        Route::post('applications',              [ApplicationController::class, 'store'])->middleware('cv.uploaded');
        Route::get('applications/{application}', [ApplicationController::class, 'show']);
        Route::get('applications/{application}/feedback', [ApplicationController::class, 'feedback']);
        Route::delete('applications/{application}', [ApplicationController::class, 'destroy']);
    });

    // ── COMPANY ──────────────────────────────────────────
    Route::middleware('role:company')->prefix('company')->group(function () {

        Route::get('dashboard',       [CompanyDashboardController::class, 'index']);
        Route::get('profile',         [CompanyProfileController::class, 'show']);
        Route::put('profile',         [CompanyProfileController::class, 'update']);
        Route::post('profile/logo',   [CompanyProfileController::class, 'uploadLogo']);
        Route::post('verify-password',[CompanyProfileController::class, 'verifyPassword']);
        Route::put('settings',        [CompanyProfileController::class, 'updateSettings']);

        Route::get('jobs',                [CompanyJobController::class, 'index']);
        Route::post('jobs',               [CompanyJobController::class, 'store']);
        Route::get('jobs/{job}',          [CompanyJobController::class, 'show']);
        Route::put('jobs/{job}',          [CompanyJobController::class, 'update']);
        Route::delete('jobs/{job}',       [CompanyJobController::class, 'destroy']);
        Route::patch('jobs/{job}/toggle', [CompanyJobController::class, 'toggle']);

        Route::get('jobs/{job}/applicants',             [ATSController::class, 'applicants']);
        Route::get('applicants',                        [ATSController::class, 'index']);
        Route::get('applicants/{application}',          [ATSController::class, 'show']);
        Route::get('applicants/{application}/cv',       [ATSController::class, 'downloadCV']);
        Route::patch('applicants/{application}/status', [ApplicationController::class, 'updateStatus']);
    });

    // ── ADMIN ─────────────────────────────────────────────
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('stats',              [AdminController::class, 'stats']);
        Route::get('users',              [AdminController::class, 'users']);
        Route::get('users/{user}',       [AdminController::class, 'showUser']);
        Route::patch('users/{user}/ban', [AdminController::class, 'toggleBan']);
        Route::get('jobs',               [AdminController::class, 'jobs']);
        Route::delete('jobs/{job}',      [AdminController::class, 'forceDeleteJob']);
        Route::patch('users/{user}/verify', [AdminController::class, 'verifyUser']);
        Route::post('verify-password',   [AdminController::class, 'verifyPassword']);
        Route::put('settings',           [AdminController::class, 'updateSettings']);
        Route::put('contact-info',       [AdminController::class, 'updateContactInfo']);
    });
});
