export function client(clientCommandName, ...args) {
  if (!this.clientProps) {
    this.clientProps = {};
  }

  switch (clientCommandName) {
    case 'setname': {
      const [name] = args;
      this.clientProps.name = name;
      return 'OK';
    }
    case 'getname':
      return this.clientProps.name;
    default:
      throw new Error(
        'This implementation of the client command does not support',
        clientCommandName
      );
  }
}
