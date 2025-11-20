import requests
import json
import csv

header = {
    "Authorization": "Bearer nms_d7cf7ebaedfa7d48595b90a176162ba4928f5e16f5065d33336a9039190ede6a" 
    }


device_types = {
    "BULLET":2,
    "DOME": 3,
    "PTZ": 4,
  }

##-- map location

with open("locations.json" , "r") as file:
    location_data = json.load(file)

print(location_data[0])


with open("cameras.csv", "r") as file:
    data = csv.DictReader(file)
    for row in data:

        if row["type"] not in ["BULLET", "DOME", "PTZ"]:
            continue

        location_id = 0

        for location in location_data:
            if location["location"] == row["location"]:
                location_id = location["id"]
                break

        if location_id == 0:
            print(f"Unbale to add device {row["name"]}")
            continue
            
        # print(json:={
        #         "attributes": {
        #         "username":row["username"],
        #         "password":row["password"],
        #         "rtsp_url":row["rtsp"],
        #         "hardware":"CAMERA",
        #         "manufacturer":row["manufacturer"]
        #         },
        #         "check_interval": 300,
        #         "device_type_id": device_types[row["type"]],
        #         "display": row["name"],
        #         "hostname": row["ip"],
        #         "ip": row["ip"],
        #         "location_id": location_id,
        #         "protocol": "ICMP"
        #         })


        try:
            response = requests.post(
                "http://103.208.173.228:8000/api/v1/devices",
                headers=header,
                json={
                "attributes": {
                "username":row["username"],
                "password":row["password"],
                "rtsp_url":row["rtsp"],
                "hardware":"CAMERA",
                "manufacturer":row["manufacturer"]
                },
                "check_interval": 300,
                "device_type_id": device_types[row["type"]],
                "display": row["name"],
                "hostname": row["ip"],
                "ip": row["ip"],
                "location_id": location_id,
                "protocol": "ICMP",
                "worker_id": "WIN-AUI96Q64U3B-208810d438d9"
                })
           
            response.raise_for_status()
            print(f"Added: {row['name']}")
   
        except Exception as e:
            print(f"Error adding {row.get('name', 'unknown')}: {e}")
