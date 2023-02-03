type Constructor<T> = new () => T;

export interface IDataObject {
  id: number;
}

export interface IDataAccessObject<T extends IDataObject> {
  contains(dataObject: T): Promise<boolean>;
  count(): Promise<number>;
  delete(dataObject: T): Promise<T>;
  deleteAll(): Promise<void>;
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | undefined>;
  first(): Promise<T | undefined>;
  isEmpty(): Promise<boolean>;
  isNotEmpty(): Promise<boolean>;
  last(): Promise<T | undefined>;
  save(dataObject: T): Promise<T>;
}

interface IDataAccessObjectRepository {
  fetch<T extends IDataObject>(type: new () => T): IDataAccessObject<T>;
}

export interface IProp {
  name: string;
  type: string;
}

export interface IDataObjectMeta<T extends IDataObject> {
  type: new () => T;
  readonly props: IProp[];
}

export class DataObjectMeta<T extends IDataObject>
  implements IDataObjectMeta<T>
{
  readonly props: IProp[] = [];

  constructor(public type: new () => T) {
    const dummy = new type();
    for (let propName in dummy) {
      const propType = typeof dummy[propName];
      this.props.push({ name: propName, type: propType });
    }
  }
}

export interface UUIdPool {
  uuid: number;
}

export interface IUUIdProvider {
  next(): Promise<number>;
}

class UUIdProviderDefault implements IUUIdProvider {
  constructor(private orm: IORM) {}

  async next(): Promise<number> {
    let idPool = await this.getIdPool();
    if (idPool === undefined) {
      idPool = await this.resetIdPool();
    } else {
      idPool.uuid++;
      await this.updateIdPool(idPool);
    }
    return idPool.uuid;
  }

  private getPath() {
    return `${this.orm.URL}/uuid.json`;
  }

  async getIdPool(): Promise<UUIdPool | undefined> {
    const path = this.getPath();
    const response = await fetch(path);
    const json = await response.json();
    if (json !== undefined && json !== null) {
      return { ...json } as UUIdPool;
    } else {
      return undefined;
    }
  }

  async updateIdPool(idPool: UUIdPool): Promise<void> {
    const path = this.getPath();
    await fetch(path, {
      method: "PUT",
      body: JSON.stringify(idPool),
      headers: { "content-type": "application/JSON" },
    });
  }

  async resetIdPool(): Promise<UUIdPool> {
    const path = this.getPath();
    const idPool: UUIdPool = { uuid: 1 };
    fetch(path, {
      method: "PATCH",
      headers: { "content-type": "application/JSON" },
      body: JSON.stringify(idPool),
    });
    return idPool;
  }
}

class DataAccessObjectRepositoryDefault implements IDataAccessObjectRepository {
  private dataAccessObjectRegistry: Map<new () => any, IDataAccessObject<any>> =
    new Map();

  constructor(private orm: IORM) {}

  fetch<T extends IDataObject>(type: new () => T): IDataAccessObject<T> {
    const dataAccessObject = this.dataAccessObjectRegistry.get(type);
    if (dataAccessObject === undefined) {
      const dataAccessObject = new DataAccessObject(type, this.orm);
      this.dataAccessObjectRegistry.set(type, dataAccessObject);
      return dataAccessObject;
    } else {
      return dataAccessObject;
    }
  }
}

export interface IORM {
  readonly URL: string;
  getIdProvider(): IUUIdProvider;
}

let DataAccessObjectRepository: IDataAccessObjectRepository;

export class ORM implements IORM {
  constructor(public URL: string) {
    DataAccessObjectRepository = new DataAccessObjectRepositoryDefault(this);
  }

  getIdProvider(): IUUIdProvider {
    return new UUIdProviderDefault(this);
  }
}

export abstract class DataObject implements IDataObject {
  id: number = 0;

  static async contains<T extends IDataObject>(
    this: Constructor<T>,
    dataObject: T
  ): Promise<boolean> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.contains(dataObject);
  }

  static async count<T extends IDataObject>(
    this: Constructor<T>
  ): Promise<number> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.count();
  }

  static async delete<T extends IDataObject>(
    this: Constructor<T>,
    dataObject: T
  ): Promise<T> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.delete(dataObject);
  }

  static async deleteAll<T extends IDataObject>(
    this: Constructor<T>
  ): Promise<void> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    await dataAccessObject.deleteAll();
  }

  static async findAll<T extends IDataObject>(
    this: Constructor<T>
  ): Promise<T[]> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.findAll();
  }

  static async findById<T extends IDataObject>(
    this: Constructor<T>,
    id: number
  ): Promise<T | undefined> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.findById(id);
  }

  static async first<T extends IDataObject>(
    this: Constructor<T>
  ): Promise<T | undefined> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.first();
  }

  static async isEmpty<T extends IDataObject>(
    this: Constructor<T>
  ): Promise<boolean> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.isEmpty();
  }

  static async isNotEmpty<T extends IDataObject>(
    this: Constructor<T>
  ): Promise<boolean> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.isNotEmpty();
  }

  static async last<T extends IDataObject>(
    this: Constructor<T>
  ): Promise<T | undefined> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.last();
  }

  static async save<T extends IDataObject>(
    this: Constructor<T>,
    dataObject: T
  ): Promise<T> {
    const dataAccessObject = DataAccessObjectRepository.fetch(this);
    return await dataAccessObject.save(dataObject);
  }
}

class DataAccessObject<T extends IDataObject> implements IDataAccessObject<T> {
  private dataObjects: T[] = [];
  private persisted: T[] = [];

  constructor(public type: new () => T, private orm: IORM) {}

  async contains(dataObject: T): Promise<boolean> {
    if ((await this.findById(dataObject.id)) !== undefined) {
      return true;
    } else {
      return false;
    }
  }

  async count(): Promise<number> {
    return (await this.findAll()).length;
  }

  async delete(dataObject: T): Promise<T> {
    const dataObjects = await this.findAll();
    const toBeDeleted = dataObjects.find((value) => {
      return value.id === dataObject.id;
    });

    if (!toBeDeleted) {
      return dataObject;
    }
    const index = dataObjects.indexOf(toBeDeleted);
    dataObjects.splice(index, 1);
    await this.sync();
    return dataObject;
  }

  async deleteAll(): Promise<void> {
    await fetch(this.getPath(), {
      method: "DELETE",
    });
    this.dataObjects = [];
    return;
  }

  async findAll(): Promise<T[]> {
    const path = `${this.getPath()}`;
    const response: Response = await fetch(path);
    const json = await response.json();

    this.dataObjects = [];
    for (let prop in json) {
      const row = json[prop];
      const dataObject = this.convertJSONtoEntity<T>(row);
      this.dataObjects.push(dataObject);
    }

    return this.dataObjects;
  }

  async findById(id: number): Promise<T | undefined> {
    const dataObjects = await this.findAll();
    return dataObjects.find((dataObject) => {
      return dataObject.id === id;
    });
  }

  async first(): Promise<T | undefined> {
    return (await this.findAll())[0];
  }

  async isEmpty(): Promise<boolean> {
    return (await this.findAll()).length === 0;
  }

  async isNotEmpty(): Promise<boolean> {
    return !(await this.isEmpty());
  }

  async last(): Promise<T | undefined> {
    const dataObjects = await this.findAll();
    if (dataObjects.length > 0) {
      return dataObjects[dataObjects.length - 1];
    } else {
      return undefined;
    }
  }

  async save(dataObject: T): Promise<T> {
    const index = this.dataObjects.indexOf(dataObject);
    if (index !== -1) {
      await this.update(dataObject);
    } else {
      await this.findAll();
      dataObject.id = await this.orm.getIdProvider().next();
      this.dataObjects.push(dataObject);
      await this.sync();
    }
    return dataObject;
  }

  private async update(dataObject: T): Promise<T> {
    await this.sync();
    return dataObject;
  }

  private async sync() {
    fetch(this.getPath(), {
      method: "PUT",
      headers: { "content-type": "application/JSON" },
      body: JSON.stringify(this.dataObjects),
    });
  }

  private getPath(): string {
    return `${this.orm.URL}/${this.type.name.toLowerCase()}.json`;
  }

  private convertJSONtoEntity<T>(data: any): T {
    return { ...data } as T;
  }
}

const orm = new ORM(
  "https://fir-b80e3-default-rtdb.europe-west1.firebasedatabase.app"
);
