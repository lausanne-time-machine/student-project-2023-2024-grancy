from __future__ import annotations
import json
import csv
from functools import reduce
from copy import deepcopy
from collections import defaultdict
from functools import cmp_to_key
import re

def print_red(text, end="\n"):
    print("\033[91m {}\033[00m" .format(text), end=end)

class Record:

    def __init__(self, record) -> None:
        self.record = record
        self.clean()
    
    def clean(self):
        match self.street:
            case 'Harpe': self.street='La-Harpe'
            case 'Église anglaise': self.street='Eglise-Anglaise'
            case 'Mont-d’or': self.street="Mont-d'Or"
            case 'Mon-loisir': self.street='Mon-Loisir'
            case 'Belle-source': self.street='Belle-Source'
            case 'François-Bocion': self.street='Bocion'
            case 'Épinettes': self.street='Epinettes'
            case 'Grande-rive': self.street='Grande-Rive'
            case 'Warney': self.street='Warnery'

    
    def getEntry(self):
        return {
            "firstname": self.record["firstname"],
            "lastname": self.record["lastname"],
            "job": self.record["cat_job"]
        }
    
    @property
    def street(self) -> str:
        return self.record["cat_loc"]
    
    @street.setter
    def street(self, value: str):
        self.record["cat_loc"] = value
    
    @property
    def nb(self) -> str:
        return self.record["street_num"]

def features_cmp(f1: Feature, f2: Feature):
    pattern = r'(\d*)(.*)'
    f1 = re.match(pattern, f1.nb).groups()
    f2 = re.match(pattern, f2.nb).groups()
    if len(f1[0]) and len(f2[0]) and int(f1[0]) - int(f2[0]) != 0:
        return int(f1[0]) - int(f2[0])
    return f1[1] > f2[1]


class FeatureCollection:

    def __init__(self, feature_collection) -> None:
        features = []
        for feat in feature_collection["features"]:
            try:
                features.append(Feature(feat))
            except KeyError as e:
                print(e)
        
        del feature_collection["features"]
        self.feature_collection_header = feature_collection
        self.features: dict[str, list[Feature]] = defaultdict(list)
        for feature in features:
            self.features[feature.street].append(feature)
        for street in self.features:
            feats = self.features[street]
            x=sum(map(lambda feat: feat.coord[0], feats))/len(feats)
            y=sum(map(lambda feat: feat.coord[1], feats))/len(feats)
            mean_feat = feats[0].duplicate()
            mean_feat.feature["geometry"]["coordinates"] = [x,y]
            mean_feat.feature["properties"]["TEXTSTRING"] = "0"
            feats.append(mean_feat)
        self.order_features(self.features)
    
    def export(self):
        to_export = deepcopy(self.feature_collection_header)
        features_to_export = []
        for street in self.features:
            for feature in self.features[street]:
                if feature.nb_people > 0:
                    features_to_export.append(feature.feature)
        to_export["features"]=features_to_export
        json_data = json.dumps(to_export, indent=4)
        with open('output.json', 'w') as json_file:
            json_file.write(json_data)
    
    def order_features(self, features):
        for street in features:
            features[street].sort(key=cmp_to_key(features_cmp))
    
    def add_records(self, records: dict[str, list[Record]]):
        self.order_features(records)
        nb_records=0
        missing_streets = []
        missing_numbers = defaultdict(lambda: defaultdict(lambda: 0))
        for street in records:
            nb_records+=len(records[street])
            if street not in self.features:
                missing_streets.append(street)
                continue
            for record in records[street]:
                if not self.add(record):
                    missing_numbers[street][record.nb]+=1
        self.print_stats(missing_streets, missing_numbers, nb_records)
    
    def add(self, record: Record):
        features = self.features[record.street]
        for feature in features:
            if feature.match(record):
                feature.add(record)
                return True
        return False
    
    def print_stats(self, missing_streets, missing_numbers, nb_records):
        nb_people=0
        for street in self.features:
            print(f'{street}: ', end="")
            for feature in self.features[street]:
                if feature.nb_people:
                    if feature.nb != "0":
                        print(f'{feature.nb}({feature.nb_people}) ', end="")
                    else:
                        print_red(f'{feature.nb}({feature.nb_people}) ', end="")
                nb_people+=feature.nb_people
            if street in missing_numbers:
                print("and missing numbers ", end="")
                for nb in missing_numbers[street]:
                    print_red(f'{nb}({missing_numbers[street][nb]}) ', end="")
            print()
        print(f"Missing streets: {missing_streets}")
        print(f"Records sucessfully added: {nb_people}/{nb_records}")


class Feature:

    def __init__(self, feature) -> None:
        self.feature = feature
        properties = {
            "RUE_ABR": self.street,
            "RUE_OFF": self.street_long,
            "TEXTSTRING": self.nb,
            "PEOPLE": []
        }
        self.feature["properties"]=properties
        try:
            if (self.coord is None or self.street is None or self.street_long is None or self.nb is None):
                raise KeyError("Not all required features in Feature")
        except TypeError:
            raise KeyError("Not all required features in Feature")

    
    def duplicate(self) -> Feature:
        return Feature(deepcopy(self.feature))
    
    def match(self, record: Record) -> bool:
        return self.street == record.street and self.nb == record.nb
    
    def add(self, record: Record):
        self.feature["properties"]["PEOPLE"].append(record.getEntry())
    
    @property
    def street(self) -> str:
        return self.feature["properties"]["RUE_ABR"]
    
    @property
    def street_long(self) -> str:
        return self.feature["properties"]["RUE_OFF"]
    
    @property
    def nb(self) -> str:
        return self.feature["properties"]["TEXTSTRING"]
    
    @property
    def nb_people(self) -> str:
        return len(self.feature["properties"]["PEOPLE"])
    
    @property
    def coord(self) -> list[float]:
        #print("Feature is" + str(self.feature))
        return self.feature["geometry"]["coordinates"]
    
    @coord.setter
    def coord(self, value: list[float]):
        self.feature["geometry"]["coordinates"] = value

def printAllNums(street_name):
    numbers = []
    for feature in jsonfile["features"]:
        if (street_name == feature["properties"]["RUE_ABR"]):
            numbers.append(feature["properties"]["TEXTSTRING"])
    print(numbers)


# Opening JSON file
with open('adresses.geojson') as json_file:
    jsonfile = json.load(json_file)

with open('1923_index_street_cat_jobs.csv', 'r') as f:
    records = list(csv.DictReader(f))

records_by_street: dict[str, list[Record]] = defaultdict(list)
for record in map(Record, records):
    records_by_street[record.street].append(record)

feature_collection = FeatureCollection(jsonfile)
feature_collection.add_records(records_by_street)
feature_collection.export()




# new_features = []
# not_found = []
# for csv_record in records:
#     found = False
#     for feature in jsonfile["features"]:
#         #print(feature["properties"])
#         if (csv_record["cat_loc"] == feature["properties"]["RUE_ABR"] and csv_record["street_num"] == feature["properties"]["TEXTSTRING"]):
#             new_feature = csv_record.copy()
#             new_feature["properties"] = csv_record
#             new_features.append(new_feature)
#             found = True
#             break
#     if not found:
#         print(csv_record["cat_loc"] + ", " + csv_record["street_num"])
#         printAllNums(csv_record["cat_loc"])
#         not_found.append(csv_record)

# print(len(not_found))
# print(len(new_features))
