# Reset Journey State Script
# Use this if the app thinks a journey is already active

adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS
adb shell am force-stop com.margsetu.driver
echo "App force stopped..."

# Clear the journey state in SharedPreferences
adb shell run-as com.margsetu.driver sh -c "cd /data/data/com.margsetu.driver/shared_prefs && ls -la"
adb shell run-as com.margsetu.driver sh -c "cd /data/data/com.margsetu.driver/shared_prefs && sed -i 's/journey_active\" value=\"true\"/journey_active\" value=\"false\"/g' MargSetuDriverPrefs.xml"
echo "Journey state reset to false..."

# Restart the app
adb shell am start -n com.margsetu.driver/.MainActivity
echo "App restarted!"
echo ""
echo "Now try clicking Start Journey and watch logcat:"
echo "adb logcat -s MainActivity:D LocationTrackingService:D"