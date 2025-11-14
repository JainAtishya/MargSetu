@echo off
echo Testing MargSetu Server Connectivity...
echo.
echo Testing localhost:5000...
curl -s http://localhost:5000/health
echo.
echo.
echo Testing WiFi IP (10.50.4.235:5000)...
curl -s http://10.50.4.235:5000/health
echo.
echo.
echo Testing Current IP (172.20.10.11:5000)...
curl -s http://172.20.10.11:5000/health
echo.
echo.
echo Testing with netstat to see if port 5000 is open...
netstat -an | findstr :5000
echo.
pause