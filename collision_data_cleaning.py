import pandas as pd

#LOADING DATASET
#path needs to be changed for others to use
raw_data = pd.read_csv("/Users/suzettemejia/Documents/GitHub/CECS450-Assignment1/Motor_Vehicle_Collisions_-_Crashes.csv")

#GETTING FAMILIAR WITH DATASET
print(raw_data.shape) #total rows and columns
print(raw_data.columns)

print(raw_data.head(10))


#DATA CLEANING
#plan: drop columns and extract dataset by crash date year
#thinking as of now to keep crash date, latitude, longitude, location, contributing factor vehicle 1, 2, vehicle type code 1,2

raw_data['Converted Date'] = pd.to_datetime(raw_data['CRASH DATE'])
raw_data['Year'] = raw_data['Converted Date'].dt.year

#print(raw_data['Year'].nunique()) #14 years of data
#print(raw_data['Year'].value_counts()) #number of crashes in each year

years = [2021, 2022, 2023, 2024, 2025]
filtered_year = raw_data[raw_data['Year'].isin(years)]
print(filtered_year.shape) #(459232, 31)

print(filtered_year['CONTRIBUTING FACTOR VEHICLE 1'].isnull().sum()) #2845 null values in column
print(filtered_year['CONTRIBUTING FACTOR VEHICLE 1'].value_counts()) #Unspecified 112761

filtered_year.dropna(subset='CONTRIBUTING FACTOR VEHICLE 1', inplace=True) #dropped null values
print(filtered_year.shape)

columns_to_keep = ['CRASH DATE', 'LATITUDE', 'LONGITUDE', 'LOCATION', 'CONTRIBUTING FACTOR VEHICLE 1', 'CONTRIBUTING FACTOR VEHICLE 2', 'VEHICLE TYPE CODE 1', 'VEHICLE TYPE CODE 2']
filtered_columns = filtered_year[columns_to_keep]
print(filtered_columns.isnull().sum()) #null values per column
