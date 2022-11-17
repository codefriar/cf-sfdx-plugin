/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { promise as glob } from 'glob-promise';
import { promises as fsPromise } from 'fs';
import { parseStringPromise, Builder } from 'xml2js';
import * as _ from 'lodash';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('cf-sfdx-plugin', 'org');

export default class Org extends SfdxCommand {
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

    glob('force-app/main/default/objects/**/*.object-meta.xml')
      .then(async function (files) {
        let iterationLength = files.length;
        while (iterationLength--) {
          await openParseEditAndWriteXMLFile(files[iterationLength]);
        }
      });
  
    return {};
  }
}

const openParseEditAndWriteXMLFile = async (fileName: string) => {
  const json = await parseXmlFile(fileName);
  if (json.CustomObject.hasOwnProperty('actionOverrides')) {
    let actionOverrideIndex = json?.CustomObject?.actionOverrides.length;
    while (actionOverrideIndex--) {
      // console.log(json.CustomObject.actionOverrides[actionOverrideIndex]['type']);
      if (json.CustomObject.actionOverrides[actionOverrideIndex]?.['type']?.[0] === 'Flexipage') {
        console.log('Found Flexipage Action Override in object file: ' + fileName + ' index node: ' + actionOverrideIndex);
        json.CustomObject.actionOverrides.splice(actionOverrideIndex, 1);
      }
    }

    const builder = new Builder();
    console.log(builder.buildObject(json));


    // let checkIndex = json?.CustomObject?.actionOverrides.length;
    // while(checkIndex--) {
    //   if (json.CustomObject.actionOverrides[actionOverrideIndex]?.['type']?.[0] === 'Flexipage') {
    //     console.log('Found Flexipage Action after deletion ' + ' index node: ' + actionOverrideIndex);
    //   }
    // }

  }

  // console.log(json);
}

const parseXmlFile = async (fileName: string) => {
  const xmlFile = await fsPromise.readFile(fileName, 'utf-8');
  return await parseStringPromise(xmlFile);
}
