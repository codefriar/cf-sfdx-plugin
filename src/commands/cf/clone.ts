import * as os from 'os';
import { flags, SfdxCommand } from '@salesforce/command';
import  * as pluginSource from '@salesforce/plugin-source'
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
// import * as process from 'child_process';
// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('cf-sfdx-plugin', 'org');

export default class Clone extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = messages.getMessage('examples').split(os.EOL);

  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    name: flags.string({
      char: 'n',
      description: messages.getMessage('nameFlagDescription'),
    }),
    force: flags.boolean({
      char: 'f',
      description: messages.getMessage('forceFlagDescription'),
    }),
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {

    pluginSource
    return {};
  }

  // private async sh(cmd) {
  //   return new Promise((resolve, reject) => {
  //     process.exec(cmd, (err, stdout, stderr) => {
  //       if (err) {
  //         console.log(err);
  //         reject({err});
  //       } else {
  //         resolve({ stdout, stderr });
  //       }
  //     });
  //   });
  // }
}
