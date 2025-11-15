import requests
import json
import csv

header = {
    "Authorization": "Bearer nms_e7e8d458a5370f12a62121dddf6e9e27ac8fb937ddc77953e45d4582366a4c61"
    }

with open("./locations.csv", "r") as file:
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
                    "name": row["name"],
                    "location_type_id": int(row["type"]),
                    "worker_id": "bs-f4289d02b815"
                }
            )
            response.raise_for_status()
            print(f"Added: {row['name']}")
        except Exception as e:
            print(f"Error adding {row.get('name', 'unknown')}: {e}")
