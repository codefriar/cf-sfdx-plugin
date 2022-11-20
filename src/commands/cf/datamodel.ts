import * as os from 'os';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { promise as glob } from 'glob-promise';
import { promises as fsPromise } from 'fs';
import { parseStringPromise, Builder } from 'xml2js';
import * as process from 'child_process';
import { CliUx } from '@oclif/core';
// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('cf-sfdx-plugin', 'org');

export default class DataModel extends SfdxCommand {
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

    try {
      await this.sh('which git');
    } catch {
      throw new Error('Git not installed');
    }
    
    try {
      const branchName = await CliUx.ux.prompt('Please type a branch name. This is used to ensure the changes made to your metadata here aren\'t lost');
      CliUx.ux.action.start('Creating branch ' + branchName);
      await this.sh(`git checkout -b ${branchName}`);
      CliUx.ux.action.stop();
    } catch {
      CliUx.ux.action.stop();
      throw new Error('Git branch / checkout failed');
    }

    const files = await glob('force-app/main/default/objects/**/*.object-meta.xml');
    let iterationLength = files.length;
    let completed = 1;
    const customBar = CliUx.ux.progress({
      format: 'PROGRESS | {bar} | {value}/{total} Files',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    })

    customBar.start()
    customBar.setTotal(iterationLength);
    while (iterationLength--) {
      customBar.update(completed++);
      await this.removePageOverrides(files[iterationLength]);
    }
    customBar.stop();
    return {};
  }

  private async removePageOverrides(fileName: string) {
    const json = await this.openAndParseXMLFile(fileName);
    
    if (json.CustomObject.hasOwnProperty('actionOverrides')) {
      let actionOverrideIndex = json?.CustomObject?.actionOverrides.length;
      while (actionOverrideIndex--) {
        if (json.CustomObject.actionOverrides[actionOverrideIndex]?.['type']?.[0] === 'Flexipage') {
          CliUx.ux.annotation(`Found Flexipage Action Override in object file: ${fileName} index node: ${actionOverrideIndex}`, 'deleting')
          // console.log();
          json.CustomObject.actionOverrides.splice(actionOverrideIndex, 1);
        }
      }

      const builder = new Builder();
      const newXml = builder.buildObject(json);
      return await this.writeXMLFile(fileName, newXml);
    }
  }

  private async openAndParseXMLFile(fileName: string){
    const xmlFile = await fsPromise.readFile(fileName, 'utf-8');
    return await parseStringPromise(xmlFile);
  }

  private async writeXMLFile(fileName: string, newXml: string) {
    await fsPromise.writeFile(fileName, newXml);
  }

  private async sh(cmd) {
    return new Promise((resolve, reject) => {
      process.exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          reject({err});
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}
