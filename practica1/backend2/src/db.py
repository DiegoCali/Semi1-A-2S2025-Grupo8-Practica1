import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        self.connection_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'database': os.getenv('DB_NAME'),
            'autocommit': True,
            'cursorclass': pymysql.cursors.DictCursor
        }

    def get_connection(self):
        return pymysql.connect(**self.connection_config)

    async def execute_procedure(self, procedure_name, params=None):
        """Ejecuta un stored procedure y retorna el primer result set"""
        connection = None
        try:
            connection = self.get_connection()
            with connection.cursor() as cursor:
                if params:
                    cursor.callproc(procedure_name, params)
                else:
                    cursor.callproc(procedure_name)
                
                # Obtener el primer result set
                result = cursor.fetchall()
                return result
        finally:
            if connection:
                connection.close()

    async def execute_query(self, query, params=None):
        """Ejecuta una query directa"""
        connection = None
        try:
            connection = self.get_connection()
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.fetchall()
        finally:
            if connection:
                connection.close()

# Instancia global
db = Database()
