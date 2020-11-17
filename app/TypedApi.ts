interface MyApi{
  Func1: {
    req: {
      name: string,
      type: 'a' | 'b' | 'c'
    },
    res: {
      order: {
        price: '',
        paid: number
      }
    },
  }
}


class Router<T> {
  post(name: keyof T){

  }
}

const api = new Router<MyApi>()
api.post('Func1')
