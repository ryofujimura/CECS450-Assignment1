import pandas as pd

#loading dataset using google colab 
#change / remove google colab & alter path
from google.colab import drive
drive.mount('/content/drive')
raw_data = pd.read_csv("/content/drive/MyDrive/Motor_Vehicle_Collisions_-_Crashes.csv")

#Familiarize ourselves with dataset

#ouput of rows/columns
print(raw_data.shape)  

#ouput columns name
print(raw_data.columns)  

#displays first 10 rows of our dataset
#modify to desire
print(raw_data.head(10))


# Crash Date to datetime and extract year
raw_data['Converted Date'] = pd.to_datetime(raw_data['CRASH DATE'])
raw_data['Year'] = raw_data['Converted Date'].dt.year

#years we are interested in 
#modified 2020-2024 because I did not identify any 2025 in dataset
years = [2020,2021, 2022, 2023,2024]
filtered_year = raw_data[raw_data['Year'].isin(years)]
print(filtered_year.shape) #outputs rows/columns in dataset



#drop rows (only keeps at least 1 valid contributing factor that is not null or unspecified)
factor1_valid = filtered_year['CONTRIBUTING FACTOR VEHICLE 1'].notnull() & (filtered_year['CONTRIBUTING FACTOR VEHICLE 1'] != "Unspecified")
factor2_valid = filtered_year['CONTRIBUTING FACTOR VEHICLE 2'].notnull() & (filtered_year['CONTRIBUTING FACTOR VEHICLE 2'] != "Unspecified")

filtered_year = filtered_year[factor1_valid | factor2_valid]


# Drop rows missing LATITUDE or LONGITUDE values (only keeps the rows with valid coordinates)
filtered_year = filtered_year[(filtered_year['LATITUDE'].notnull()) & (filtered_year['LONGITUDE'].notnull())]


# Drop rows (only keeps rows where at least 1 vehicle type code is still valid)
vcode1_valid = filtered_year['VEHICLE TYPE CODE 1'].notnull() & (filtered_year['VEHICLE TYPE CODE 1'] != "NaN")
vcode2_valid = filtered_year['VEHICLE TYPE CODE 2'].notnull() & (filtered_year['VEHICLE TYPE CODE 2'] != "Nan")

filtered_year = filtered_year[vcode1_valid | vcode2_valid]



# Keeps useful columns identified from dataset
columns_to_keep = ['CRASH DATE','LATITUDE','LONGITUDE','LOCATION',
                   'CONTRIBUTING FACTOR VEHICLE 1','CONTRIBUTING FACTOR VEHICLE 2',
                   'VEHICLE TYPE CODE 1','VEHICLE TYPE CODE 2']
filtered_columns = filtered_year[columns_to_keep]

# Null values per column
print("Null values per column:\n", filtered_columns.isnull().sum())

# Displayed the rows of cleaned data
print("Cleaned data completed below: \n")
print(filtered_columns)
