import pandas as pd

#loading dataset
#path needs to be changed for others to use
raw_data = pd.read_csv("/Users/suzettemejia/Documents/GitHub/CECS450-Assignment1/Motor_Vehicle_Collisions_-_Crashes.csv")

#getting familiar with the dataset
print(raw_data.shape) #total rows and columns
print(raw_data.columns)

print(raw_data.head(10))

#plan: drop columns and extract dataset by crash date year
#thinking as of now to keep crash date, latitude, longitude, location, contributing factor vehicle 1, 2, vehicle type code 1,2

raw_data['Converted Date'] = pd.to_datetime(raw_data['CRASH DATE'])
raw_data['Year'] = raw_data['Converted Date'].dt.year

print(raw_data['Year'].nunique()) #14 years of data
print(raw_data['Year'].value_counts()) #number of crashes in each year