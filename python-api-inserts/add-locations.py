import requests
import json
import csv

header = {
    "Authorization": "Bearer nms_d7cf7ebaedfa7d48595b90a176162ba4928f5e16f5065d33336a9039190ede6a"
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
                    "worker_id": "WIN-AUI96Q64U3B-208810d438d9"
                }
            )
            response.raise_for_status()
            print(f"Added: {row['name']}")
        except Exception as e:
            print(f"Error adding {row.get('name', 'unknown')}: {e}")
