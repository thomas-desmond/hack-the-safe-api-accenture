import pandas as pd
import sqlite3
import sys

def convert_sql_to_csv(sql_file, output_file='output.csv'):
    # Read the SQL file
    with open(sql_file, 'r') as f:
        sql_commands = f.read()

    # Create a temporary in-memory database
    conn = sqlite3.connect(':memory:')

    # Execute the SQL commands
    for command in sql_commands.split(';'):
        if command.strip():
            conn.execute(command)

    # Read the users table into a pandas DataFrame
    df = pd.read_sql_query("SELECT * FROM users", conn)

    # Save to CSV
    df.to_csv(output_file, index=False)
    print(f"Successfully converted {sql_file} to {output_file}")

    # Close the connection
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python convert_to_sheets.py <input.sql>")
        sys.exit(1)

    input_file = sys.argv[1]
    convert_sql_to_csv(input_file)
