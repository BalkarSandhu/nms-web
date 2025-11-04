import requests
import json
import csv

header = {
    "Authorization": "Bearer nms_d4a8be55b70fb6a5ce1179b3f17398f09842791c4fa7baeeb38365b586c13f43"
}

with open("locations.csv", "r") as file:
    data = csv.DictReader(file)
    for row in data:
        try:
            response = requests.post(
                "http://103.208.173.228:8000/api/v1/locations",
                headers=header,
                json={
                    "area": "BLOCK II",
                    "lat": float(row["lat"]),
                    "lng": float(row["long"]),
                    "location": row["name"],
                    "location_type_id": int(row["type"])
                }
            )
            response.raise_for_status()
            print(f"Added: {row['name']}")
        except Exception as e:
            print(f"Error adding {row.get('name', 'unknown')}: {e}")
