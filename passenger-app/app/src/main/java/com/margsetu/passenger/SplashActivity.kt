package com.margsetu.passenger

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.BounceInterpolator
import android.view.animation.OvershootInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.margsetu.passenger.activities.LanguageSelectionActivity
import com.margsetu.passenger.databinding.ActivitySplashBinding
import com.margsetu.passenger.utils.LanguageUtils

class SplashActivity : AppCompatActivity() {
    
    private val TAG = "SplashActivity"
    private lateinit var binding: ActivitySplashBinding
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "SplashActivity onCreate started")
        
        try {
            // Apply saved language before setting content view
            val savedLanguage = LanguageUtils.getAppLanguage(this)
            LanguageUtils.updateAppLocale(this, savedLanguage)
            
            // Hide status bar for immersive experience
            window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            or View.SYSTEM_UI_FLAG_FULLSCREEN
                            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    )
            
            binding = ActivitySplashBinding.inflate(layoutInflater)
            setContentView(binding.root)
            Log.d(TAG, "Layout set successfully")
            
            // Start the cinematic animation sequence
            startCinematicAnimation()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in onCreate", e)
            // Direct navigation if anything fails
            navigateDirectly()
        }
    }
    
    private fun startCinematicAnimation() {
        try {
            Log.d(TAG, "Starting cinematic animation")
            
            // Phase 1: Camera zoom effect with bus logo scaling in
            val busScaleX = ObjectAnimator.ofFloat(binding.busLogo, "scaleX", 0f, 1.2f, 1f)
            val busScaleY = ObjectAnimator.ofFloat(binding.busLogo, "scaleY", 0f, 1.2f, 1f)
            val busRotation = ObjectAnimator.ofFloat(binding.busLogo, "rotation", -5f, 5f, 0f)
            
            busScaleX.duration = 1200
            busScaleY.duration = 1200
            busRotation.duration = 1200
            
            busScaleX.interpolator = BounceInterpolator()
            busScaleY.interpolator = BounceInterpolator()
            busRotation.interpolator = AccelerateDecelerateInterpolator()
            
            val busAnimatorSet = AnimatorSet()
            busAnimatorSet.playTogether(busScaleX, busScaleY, busRotation)
            
            // Phase 2: Camera overlay transition effect
            val cameraOverlayAlpha = ObjectAnimator.ofFloat(binding.cameraOverlay, "alpha", 0f, 0.8f, 0f)
            cameraOverlayAlpha.duration = 800
            cameraOverlayAlpha.startDelay = 800
            cameraOverlayAlpha.interpolator = AccelerateDecelerateInterpolator()
            
            // Show camera overlay when animation starts
            binding.cameraOverlay.visibility = View.VISIBLE
            
            // Phase 3: Title and subtitle fade in with overshoot
            val titleAlpha = ObjectAnimator.ofFloat(binding.titleContainer, "alpha", 0f, 1f)
            val titleTranslationY = ObjectAnimator.ofFloat(binding.titleContainer, "translationY", 50f, 0f)
            val titleScaleX = ObjectAnimator.ofFloat(binding.titleContainer, "scaleX", 0.8f, 1f)
            val titleScaleY = ObjectAnimator.ofFloat(binding.titleContainer, "scaleY", 0.8f, 1f)
            
            titleAlpha.duration = 800
            titleTranslationY.duration = 800
            titleScaleX.duration = 800
            titleScaleY.duration = 800
            
            titleAlpha.startDelay = 1400
            titleTranslationY.startDelay = 1400
            titleScaleX.startDelay = 1400
            titleScaleY.startDelay = 1400
            
            titleAlpha.interpolator = AccelerateDecelerateInterpolator()
            titleTranslationY.interpolator = OvershootInterpolator()
            titleScaleX.interpolator = OvershootInterpolator()
            titleScaleY.interpolator = OvershootInterpolator()
            
            val titleAnimatorSet = AnimatorSet()
            titleAnimatorSet.playTogether(titleAlpha, titleTranslationY, titleScaleX, titleScaleY)
            
            // Phase 4: Loading indicator with smooth fade in
            val loadingAlpha = ObjectAnimator.ofFloat(binding.loadingContainer, "alpha", 0f, 1f)
            val loadingTranslationY = ObjectAnimator.ofFloat(binding.loadingContainer, "translationY", 30f, 0f)
            
            loadingAlpha.duration = 600
            loadingTranslationY.duration = 600
            loadingAlpha.startDelay = 2000
            loadingTranslationY.startDelay = 2000
            
            loadingAlpha.interpolator = AccelerateDecelerateInterpolator()
            loadingTranslationY.interpolator = AccelerateDecelerateInterpolator()
            
            val loadingAnimatorSet = AnimatorSet()
            loadingAnimatorSet.playTogether(loadingAlpha, loadingTranslationY)
            
            // Start all animations
            busAnimatorSet.start()
            cameraOverlayAlpha.start()
            titleAnimatorSet.start()
            loadingAnimatorSet.start()
            
            // Navigate after animation completes
            Handler(Looper.getMainLooper()).postDelayed({
                Log.d(TAG, "Animation completed, navigating to next screen")
                navigateToNextScreen()
            }, 4000) // Total animation time + buffer
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in cinematic animation", e)
            // Fallback to simple display
            showSimpleSplash()
        }
    }
    
    private fun showSimpleSplash() {
        try {
            Log.d(TAG, "Showing simple splash fallback")
            // Make all elements visible
            binding.busLogo.scaleX = 1f
            binding.busLogo.scaleY = 1f
            binding.titleContainer.alpha = 1f
            binding.loadingContainer.alpha = 1f
            binding.cameraOverlay.visibility = View.GONE
            
            // Navigate after delay
            Handler(Looper.getMainLooper()).postDelayed({
                Log.d(TAG, "Simple splash completed, navigating to next screen")
                navigateToNextScreen()
            }, 3000)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in simple splash", e)
            navigateDirectly()
        }
    }
    
    private fun navigateToNextScreen() {
        try {
            Log.d(TAG, "Starting navigation")
            val intent = Intent(this, LanguageSelectionActivity::class.java)
            startActivity(intent)
            finish()
            Log.d(TAG, "Navigation completed successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in navigation", e)
            navigateDirectly()
        }
    }
    
    private fun navigateDirectly() {
        try {
            Log.d(TAG, "Attempting direct navigation")
            val intent = Intent()
            intent.setClassName(this, "com.margsetu.passenger.activities.LanguageSelectionActivity")
            startActivity(intent)
            finish()
        } catch (e: Exception) {
            Log.e(TAG, "Direct navigation also failed", e)
            // Last resort - just finish the activity
            finish()
        }
    }
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Disable back button on splash screen
        Log.d(TAG, "Back button pressed - ignored")
    }
}
