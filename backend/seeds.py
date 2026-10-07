from app.database import get_database
from app.seed_data import build_demo_data


def main() -> None:
    db = get_database()
    demo = build_demo_data()
    for name, items in demo.items():
        collection = db[name]
        collection.delete_many({})
        collection.insert_many(items)
    print('Seeded demo CRM data into MongoDB.')


if __name__ == '__main__':
    main()
