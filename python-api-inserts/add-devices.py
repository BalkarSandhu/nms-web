import requests
import json
import csv

header = {
    "Authorization": "Bearer nms_d4a8be55b70fb6a5ce1179b3f17398f09842791c4fa7baeeb38365b586c13f43"
}


device_types = {
    "BULLET":1,
    "DOME": 2,
    "PTZ": 3,
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
                "protocol": "ICMP"
                })
           
            response.raise_for_status()
            print(f"Added: {row['name']}")
   
        except Exception as e:
            print(f"Error adding {row.get('name', 'unknown')}: {e}")
