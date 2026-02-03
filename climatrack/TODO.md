# TODO: Modify Home Page to List Farmers with Lat/Lng/Alt from Google Maps

## Steps to Complete

1. **Update home.ts to load farmers instead of parcels** ✅
   - Change data model from Parcelle[] to Farmer[]
   - Update loadParcelles to loadFarmers using API call to /index.php?action=farmers
   - Remove parcel-specific logic (deleteParcelle, voirDetails, etc.)

2. **Add geocoding logic to home.ts** ✅
   - Create method to geocode address to lat/lng using Google Geocoding API
   - Add latitude, longitude properties to Farmer interface
   - Call geocoding for each farmer's address after loading

3. **Add elevation logic to home.ts** ✅
   - Create method to get altitude from lat/lng using Google Elevation API
   - Add altitude property to Farmer interface
   - Call elevation API after geocoding

4. **Update home.html table** ✅
   - Change table headers to: ID, Nom, Prénom, Email, Téléphone, Adresse, Latitude, Longitude, Altitude
   - Update table rows to display farmer data
   - Remove parcel-specific actions (Voir details, Supprimer)

5. **Update map rendering** ✅
   - Modify renderParcelsOnMap to renderFarmersOnMap
   - Display markers for farmers instead of parcels
   - Update marker info windows to show farmer details

6. **Handle API errors gracefully** ✅
   - Add error handling for geocoding and elevation API failures
   - Display fallback values (e.g., '-' for missing lat/lng/alt)
   - Log errors to console

## Dependent Files
- src/app/agri/home/home.ts ✅
- src/app/agri/home/home.html ✅

## Followup Steps
- Test geocoding and elevation API calls
- Verify map markers display correctly
- Ensure error handling works for missing addresses or API failures

# TODO: Implement Farmer Parcels Page

## Steps to Complete

1. **Create FarmerParcels component** ✅
   - Create farmer-parcels.ts with component logic to fetch parcels by farmer ID
   - Create farmer-parcels.html with table displaying parcel details
   - Add displayedColumns for table headers: Nom, Surface (m²), Latitude (m), Longitude (m), Altitude (m)

2. **Integrate with routing** ✅
   - Route already configured in app.routes.ts: 'agriculteurs/:id/parcelles' -> FarmerParcels
   - Button in farmers-list.html navigates to this route

3. **Handle data loading and errors** ✅
   - Add loading state and error handling in component
   - Use ParcellesService.getByUser() to fetch parcels
   - Display fallback values for missing data

## Dependent Files
- src/app/admin/farmer-parcels/farmer-parcels.ts ✅
- src/app/admin/farmer-parcels/farmer-parcels.html ✅

## Followup Steps
- Test the "voir parcelles" button navigation
- Verify parcel data displays correctly in the table
- Ensure proper error handling for API failures

# TODO: Implement Hourly Weather Updates for All Parcels

## Steps to Complete

1. **Create batch file for weather updates** ✅
   - Create weather_update.bat to execute the PHP weather cron script
   - Batch file runs the index.php script which fetches weather data for all parcels

2. **Schedule hourly weather updates** ✅
   - Use Windows Task Scheduler to run the batch file every hour
   - Task named "ClimatrackWeatherUpdate" executes weather_update.bat hourly

3. **Verify weather data collection** ✅
   - The PHP script fetches current weather from OpenWeatherMap API
   - Inserts temperature, humidity, rain, wind data into meteo_data table
   - Marks records as "cold" if temperature < 7°C

4. **Fix API key configuration** ✅
   - Set OPENWEATHER_API_KEY in the batch file for PHP CLI execution
   - Recreate scheduled task with proper configuration

## Dependent Files
- weather_update.bat ✅
- ../../xampp/htdocs/climatrack-api/index.php (existing cron logic) ✅

## Followup Steps
- Test the scheduled task runs correctly ✅
- Verify weather data is being inserted into the database hourly ✅
- Monitor for any API rate limits or failures
