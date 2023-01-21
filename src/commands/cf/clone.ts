import * as os from 'os';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as process from 'child_process';
import * as _ from 'lodash';
import { CliUx } from '@oclif/core';
// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('cf-sfdx-plugin', 'clone');

export default class Clone extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = messages.getMessage('examples').split(os.EOL);

  // public static args = [{ name: 'file' }];

  public static varargs = true;

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    scratchorgalias: flags.string({
      char: 'a',
      required: true,
      description: messages.getMessage('aliasNameDescription'),
    }),
    force: flags.boolean({
      char: 'f',
      description: messages.getMessage('forceFlagDescription'),
    }),
    verbose: flags.builtin()
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = true;

  public async run(): Promise<AnyJson> {
    await this.retrieveMetadataTypes();
    await this.retrieveObjects();
    await this.retrieveStdValueSets();
    // await this.createScratchOrg(this.flags.scratchorgalias);
    //await this.setupManagedPackages(this.flags.scratchorgalias);
    // return json
    return {};
  }

  public async createScratchOrg(newScratchOrgAlias: string) {
    return await this.sh(`sfdx force:org:create -f ./config/project-scratch-def.json -a ${newScratchOrgAlias} -s -d 30`);
  }

  public async setupManagedPackages(newScratchOrgAlias: string) {
    const managedPackageMap = await this.retrieveInstalledManagedPackages(newScratchOrgAlias);
    await this.enabledFieldHistoryTracking('CustomField:Opportunity.Amount');
    for (const [packageId, packageName] of managedPackageMap.entries()) {
      await this.installManagedPackage(packageName, packageId, 'scratchOrgTest');
    }
  }

  public async enabledFieldHistoryTracking(metadataComponent: string) {
    return this.deploySingularMetadataComponent(metadataComponent);
  }

  public async deploySingularMetadataComponent(metadataComponent: string) {
    CliUx.ux.action.start(`Deploying ${metadataComponent}`);
    await this.sh(
      `sfdx force:source:deploy -m ${metadataComponent}`
    );
    CliUx.ux.action.stop("Done!");
  }

  public async installManagedPackage(packageName: string, packageId: string, whereAlias: string){
    CliUx.ux.action.start(`Installing package ${packageName}`);
    try {
      await this.sh(`sfdx force:package:beta:install -u ${whereAlias} -p ${packageId} -w 10 -r`);
    } catch (err) {
      CliUx.ux.annotation(`Error installing package ${packageName}`, err);
      if (err.message.includes("is already installed in your organization. You will need to uninstall it before installing a new version.")) {
        CliUx.ux.action.stop("Already installed!");
        return;
      } else {
        throw err;
      }
    }
    CliUx.ux.action.stop("Done!");
  }

  public async retrieveInstalledManagedPackages(sandboxAlias: string) {
    CliUx.ux.action.start("Fetching installed managed packages list from your DevHub org, and diffing them against your scratch org")
    const installedPackagesInProduction = await this.sh(`sfdx force:package:installed:list -u ${this.org.getConnection().getUsername()} --json`);
    const installedPackagesInScratchOrg = await this.sh(`sfdx force:package:installed:list -u ${sandboxAlias} --json`);

    const productionResults = JSON.parse(installedPackagesInProduction.stdout).result;
    const scratchOrgInstalledPackageVersionIds = _.map(JSON.parse(installedPackagesInScratchOrg.stdout).result, 'SubscriberPackageVersionId');
    let packageMap = new Map();
    productionResults.forEach((result) => {
      if (!scratchOrgInstalledPackageVersionIds.includes(result.SubscriberPackageVersionId)) {
        packageMap.set(result.SubscriberPackageVersionId, result.SubscriberPackageName);
      }
    });
    CliUx.ux.action.stop("Done!");
    return packageMap;
  }

  public async retrieveStdValueSets() {
    CliUx.ux.action.start("Retrieving standard value sets ")
    const standardValueSets = ["AccountContactMultiRoles", "AccountContactRole", "AccountOwnership", "AccountRating", "AccountType", "AssetActionCategory", "AssetRelationshipType", "AssetStatus", "AssociatedLocationType", "CampaignMemberStatus", "CampaignStatus", "CampaignType", "CardType", "CaseContactRole", "CaseOrigin", "CasePriority", "CaseReason", "CaseStatus", "CaseType", "ChangeRequestRelatedItemImpactLevel", "ChangeRequestBusinessReason", "ChangeRequestCategory", "ChangeRequestImpact", "ChangeRequestPriority", "ChangeRequestRiskLevel", "ChangeRequestStatus", "ContactPointAddressType", "ContactPointUsageType", "ContactRequestReason", "ContactRequestStatus", "ContactRole", "ContractContactRole", "ContractStatus", "ConsequenceOfFailure", "DigitalAssetStatus", "EntitlementType", "EventSubject", "EventType", "FinanceEventAction", "FinanceEventType", "FiscalYearPeriodName", "FiscalYearPeriodPrefix", "FiscalYearQuarterName", "FiscalYearQuarterPrefix", "ForecastingItemCategory", "FulfillmentStatus", "FulfillmentType", "IdeaMultiCategory", "IdeaStatus", "IdeaThemeStatus", "IncidentCategory", "IncidentImpact", "IncidentPriority", "IncidentRelatedItemImpactLevel", "IncidentRelatedItemImpactType", "IncidentReportedMethod", "IncidentStatus", "IncidentSubCategory", "IncidentType", "IncidentUrgency", "Industry", "LeadSource", "LeadStatus", "LocationType", "MilitaryService", "OpportunityCompetitor", "OpportunityStage", "OpportunityType", "OrderItemSummaryChgRsn", "OrderStatus", "OrderSummaryRoutingSchdRsn", "OrderSummaryStatus", "OrderType", "PartnerRole", "ProblemCategory", "ProblemImpact", "ProblemPriority", "ProblemRelatedItemImpactLevel", "ProblemRelatedItemImpactType", "ProblemStatus", "ProblemSubCategory", "ProblemUrgency", "ProcessExceptionCategory", "ProcessExceptionPriority", "ProcessExceptionSeverity", "ProcessExceptionStatus", "Product2Family", "QuantityUnitOfMeasure", "QuickTextCategory", "QuickTextChannel", "QuoteStatus", "RoleInTerritory2", "ResourceAbsenceType", "ReturnOrderLineItemProcessPlan", "ReturnOrderLineItemReasonForRejection", "ReturnOrderLineItemReasonForReturn", "ReturnOrderLineItemRepaymentMethod", "ReturnOrderShipmentType", "ReturnOrderStatus", "SalesTeamRole", "Salutation", "ScorecardMetricCategory", "ServiceAppointmentStatus", "ServiceContractApprovalStatus", "ServTerrMemRoleType", "ShiftStatus", "SocialPostClassification", "SocialPostEngagementLevel", "SocialPostReviewedStatus", "SolutionStatus", "StatusReason", "TaskPriority", "TaskStatus", "TaskSubject", "TaskType", "UnitOfMeasure", "WorkOrderLineItemPriority", "WorkOrderLineItemStatus", "WorkOrderPriority", "WorkOrderStatus", "WorkStepStatus", "WorkTypeDefApptType", "WorkTypeGroupAddInfo"];
    for (const toRetrieve of this.chunkArray(standardValueSets, 5, true, ', StandardValueSet:')) {
      CliUx.ux.annotation(`Retrieving ${toRetrieve}`, toRetrieve);
      await this.retrieveMetadata(toRetrieve);
    }
    CliUx.ux.action.stop("Done!");
  }

  public async retrieveObjects() {
    CliUx.ux.action.start('Fetching object types');
    const stdTypes = await this.fetchStandardTypes();
    CliUx.ux.action.stop("done");
    CliUx.ux.action.start("Retrieving standard types ")
    for (const toRetrieve of this.chunkArray(stdTypes, 5, true, ', CustomObject:')) {
      CliUx.ux.annotation(`Retrieving ${toRetrieve}`, toRetrieve);
      await this.retrieveMetadata(toRetrieve);
    }
    CliUx.ux.action.stop("Done!");
  }

  public async retrieveMetadataTypes() {
    CliUx.ux.action.start('Fetching metadata types');
    const mdtTypes = await this.fetchMetadataTypes();
    CliUx.ux.action.stop("done");

    CliUx.ux.annotation("Retrieving metadata types ", "");
    let completed = 1;
    const chunkedRetrieval = this.chunkArray(mdtTypes, 5, false, ', ');
    const customProgressBar = CliUx.ux.progress({
      format: 'PROGRESS | {bar} | {value}/{total} Metadata Components',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    })
    customProgressBar.start();
    customProgressBar.setTotal(chunkedRetrieval.length);
    for (const toRetrieve of chunkedRetrieval) {
      // console.log(toRetrieve);
      CliUx.ux.annotation(`Retrieving ${toRetrieve}`, toRetrieve);
      customProgressBar.update(completed++);
      await this.retrieveMetadata(toRetrieve);
    }
    customProgressBar.stop();
  }

  public chunkArray(incomingArray, chunkSize, preface, joinString):Array<string> {
    const chunks = _.chunk(incomingArray, chunkSize);
    let toReturn = [];
    for (const chunk of chunks) {
      let thisChunkJoined = chunk.join(joinString);
      if (preface == true) {
        thisChunkJoined = joinString.replace(/,/g, '').trim() + thisChunkJoined;    
      }
      toReturn.push(thisChunkJoined);
    }
    return toReturn;
  }

  public async retrieveMetadata(toRetrieve): Promise<any> {
    await this.sh(`sfdx force:source:retrieve -u ${this.org.getConnection().getUsername()} -m "${toRetrieve}"`);
  }

  public async fetchMetadataTypes() {
    const unsupportedMetadataTypes = ["EventRelayConfig", "ActionLauncherItemDef", "ContentAsset", "SearchCustomization"];
    try {
      const metadataTypeQuery = await this.sh(`sfdx force:mdapi:describemetadata -u ${this.org.getConnection().getUsername()} --json`);
      const metadataTypes = JSON.parse(metadataTypeQuery.stdout).result.metadataObjects;
      const justNames = _.map(metadataTypes, 'xmlName');
      const filteredMetadataTypes = _.reject(justNames, (record) => {
        return _.includes(unsupportedMetadataTypes, record);
      });
      return filteredMetadataTypes;
    } catch (err) {
      throw new Error(err);
    }
  }

  public async fetchStandardTypes() {
    const standardObjectQuery = "\"SELECT QualifiedAPIName FROM EntityDefinition WHERE IsRetrieveable = true AND IsCustomizable = true\"";
    try {
      const results = await this.sh(`sfdx force:data:soql:query -u ${this.org.getConnection().getUsername()} -q ${standardObjectQuery} --json`);
      const standardObjects = JSON.parse(results.stdout).result.records;
      return _.map(_.filter(standardObjects, (value) => {
        return !value.QualifiedApiName.endsWith('__c');
      }), 'QualifiedApiName');
    } catch (err) {
      throw new Error(err);
    }
  }

  private async sh(cmd): Promise<any> {
    return new Promise((resolve, reject) => {
      process.exec(cmd, {maxBuffer: 2097152}, (err, stdout, stderr) => {
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
