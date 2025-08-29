class EventModel {
  id: string;
  type: string;
  time: number;
  data: any;

  constructor(
    id: string,
    type: string,
    time: number = Date.now(),
    data: any = {}
  ) {
    if (!id) {
      throw new Error("Event must have an id");
    }
    if (!type) {
      throw new Error("Event must have a type");
    }
    this.id = id;
    this.time = time;
    this.type = type;
    this.data = data;
  }

  isTypeOf(type: string) {
    return this.type === type;
  }

  getType() {
    return this.type;
  }

  getData() {
    return this.data;
  }
}

export default EventModel;
