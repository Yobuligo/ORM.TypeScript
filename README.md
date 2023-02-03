# ORM.TypeScript
A simple ORM written in and for TypeScript to manage data by REST calls especially for firebase as store. The usage is to create test data in a simple way.

## Usage
Prerequisite is access to a firebase database.

### Connect your ORM with a firebase database
Call function connectORM. This connection is used for all REST calls within your session.
`connectORM("<firebase_url>");`

### Create a data object
A data class or data object provides the data which should be persisted. This data class must be inherited from DataObject. The class DataObject provides (static) methods to handle CRUD operations.
```
class Animal extends DataObject {
  name: string = "Elephant";
  age: 12;
}
```

The class name is used as path to the data object. So for the class Animal the path is /animal.json
To redefine the path, add the static property "path" followed by the alternative path.
```
class Animal extends DataObject {
  static path: string = "/creatures";
  name: string = "Elephant";
  age: 12;
}
```

### Save or update a data object instance
First create an instance of the data object. The data object class provides a type safe method save to persist the data object.
To update an existing instance method save can be used as well.
```
const animal = new Animal();
Animal.save(animal);
```

### Find all data objects
Call method findAll at the data object class to fetch all current instances of a data object type.
```
const animals = Animal.findAll();
```

### Find a data object by id
An alternative to findAll is findById to retrieve a data object with a specific id. If the data object doesn't exist undefined is returned instead.
```
const animal = Animal.findById(123);
```

### Delete a data object
To delete a data object call method delete.
```
Animal.delete(animal)
```

### Additional methods
The DataObject class provides additional methods to write more readable code, like the following:
```
Animal.contains(animal)
Animal.count()
Animal.first()
Animal.isEmpty()
Animal.isNotEmpty()
Animal.last()
```
