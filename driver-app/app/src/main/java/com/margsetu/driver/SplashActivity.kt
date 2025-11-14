package com.margsetu.driver

import android.animation.*
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.margsetu.driver.databinding.ActivitySplashBinding
import com.margsetu.driver.utils.LanguageUtils

class SplashActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivitySplashBinding
    private lateinit var animatorSet: AnimatorSet
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Apply saved language before setting content view
        val savedLanguage = LanguageUtils.getAppLanguage(this)
        LanguageUtils.updateAppLocale(this, savedLanguage)
        
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Hide system UI for full immersion
        hideSystemUI()
        
        // Start the cinematic bus entrance animation
        startBusEntranceAnimation()
    }
    
    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }
    
    private fun startBusEntranceAnimation() {
        animatorSet = AnimatorSet()
        
        // Phase 1: Bus appears from distance (small to normal size)
        val busApproachAnimation = createBusApproachAnimation()
        
        // Phase 2: Camera flies into windshield (zoom and fade effect)
        val windshieldEntryAnimation = createWindshieldEntryAnimation()
        
        // Phase 3: Transition overlay and title reveal
        val titleRevealAnimation = createTitleRevealAnimation()
        
        // Phase 4: Navigate to next screen
        val navigationAnimation = createNavigationAnimation()
        
        // Chain all animations together
        animatorSet.apply {
            playSequentially(
                busApproachAnimation,
                windshieldEntryAnimation,
                titleRevealAnimation,
                navigationAnimation
            )
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }
    }
    
    private fun createBusApproachAnimation(): AnimatorSet {
        val approachSet = AnimatorSet()
        
        // Start bus even smaller and more distant for dramatic effect
        binding.busContainer.scaleX = 0.15f  // Even smaller start
        binding.busContainer.scaleY = 0.15f
        binding.busContainer.alpha = 0.4f    // More faded
        binding.busContainer.translationY = 50f // Add vertical movement
        
        // Animate bus approaching (getting larger and clearer)
        val scaleX = ObjectAnimator.ofFloat(binding.busContainer, "scaleX", 0.15f, 1.1f, 1.0f) // Overshoot effect
        val scaleY = ObjectAnimator.ofFloat(binding.busContainer, "scaleY", 0.15f, 1.1f, 1.0f)
        val alpha = ObjectAnimator.ofFloat(binding.busContainer, "alpha", 0.4f, 1.0f)
        val translateY = ObjectAnimator.ofFloat(binding.busContainer, "translationY", 50f, -10f, 0f)
        
        // Add more dynamic rotation for realism
        val rotation = ObjectAnimator.ofFloat(binding.busLogo, "rotation", -8f, 2f, 0f)
        
        approachSet.apply {
            playTogether(scaleX, scaleY, alpha, rotation, translateY)
            duration = 700  // Reduced from 1500ms - Much faster!
            interpolator = AccelerateDecelerateInterpolator() // More dynamic motion
        }
        
        return approachSet
    }
    
    private fun createWindshieldEntryAnimation(): AnimatorSet {
        val entrySet = AnimatorSet()
        
        // Camera "flies into" windshield - MORE dramatic zoom
        val zoomX = ObjectAnimator.ofFloat(binding.busContainer, "scaleX", 1.0f, 4.5f)  // Bigger zoom
        val zoomY = ObjectAnimator.ofFloat(binding.busContainer, "scaleY", 1.0f, 4.5f)
        
        // Fade out bus as we "pass through" windshield - faster fade
        val fadeOut = ObjectAnimator.ofFloat(binding.busContainer, "alpha", 1.0f, 0.0f)
        
        // Camera overlay simulates going through windshield - more intense
        val overlayFadeIn = ObjectAnimator.ofFloat(binding.cameraOverlay, "alpha", 0f, 0.8f)  // More intense overlay
        val overlayFadeOut = ObjectAnimator.ofFloat(binding.cameraOverlay, "alpha", 0.8f, 0.0f)
        
        // Chain overlay effects with faster timing
        val overlaySequence = AnimatorSet()
        overlaySequence.playSequentially(overlayFadeIn, overlayFadeOut)
        
        entrySet.apply {
            playTogether(zoomX, zoomY, fadeOut, overlaySequence)
            duration = 600  // Reduced from 1200ms - More dynamic entry!
            interpolator = AccelerateDecelerateInterpolator()
        }
        
        return entrySet
    }
    
    private fun createTitleRevealAnimation(): AnimatorSet {
        val titleSet = AnimatorSet()
        
        // Title appears with elegant entrance
        binding.titleContainer.alpha = 0f
        binding.titleContainer.translationY = 100f
        
        val titleAlpha = ObjectAnimator.ofFloat(binding.titleContainer, "alpha", 0f, 1.0f)
        val titleSlide = ObjectAnimator.ofFloat(binding.titleContainer, "translationY", 100f, 0f)
        val titleScale = ObjectAnimator.ofFloat(binding.titleContainer, "scaleX", 0.8f, 1.0f)
        val titleScaleY = ObjectAnimator.ofFloat(binding.titleContainer, "scaleY", 0.8f, 1.0f)
        
        // Loading indicator appears
        val loadingAlpha = ObjectAnimator.ofFloat(binding.loadingIndicator, "alpha", 0f, 1.0f)
        
        titleSet.apply {
            playTogether(titleAlpha, titleSlide, titleScale, titleScaleY, loadingAlpha)
            duration = 500  // Reduced from 800ms - Snappy title reveal!
            interpolator = OvershootInterpolator(1.2f) // More bounce for dynamic feel
        }
        
        return titleSet
    }
    
    private fun createNavigationAnimation(): AnimatorSet {
        val navSet = AnimatorSet()
        
        // Much shorter hold time, then quick fade out
        val holdAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 400 // Reduced from 1000ms - Quick hold time
        }
        
        val fadeOut = ObjectAnimator.ofFloat(binding.titleContainer, "alpha", 1.0f, 0f)
        val loadingFadeOut = ObjectAnimator.ofFloat(binding.loadingIndicator, "alpha", 1.0f, 0f)
        
        navSet.apply {
            playSequentially(
                holdAnimator,
                AnimatorSet().apply {
                    playTogether(fadeOut, loadingFadeOut)
                    duration = 300 // Reduced from 500ms - Faster fade out
                }
            )
            
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    navigateToNextScreen()
                }
            })
        }
        
        return navSet
    }
    
    private fun navigateToNextScreen() {
        // Check if user is logged in to determine next screen
        val sharedPreferences = getSharedPreferences("MargSetuDriverPrefs", MODE_PRIVATE)
        val isLoggedIn = sharedPreferences.getBoolean("is_logged_in", false)
        
        val intent = if (isLoggedIn) {
            Intent(this, MainActivity::class.java)
        } else {
            Intent(this, LanguageSelectionActivity::class.java)
        }
        
        startActivity(intent)
        
        // Custom transition to continue the smooth experience
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        finish()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (::animatorSet.isInitialized) {
            animatorSet.cancel()
        }
    }
    
    override fun onBackPressed() {
        // Disable back button during splash animation
    }
}