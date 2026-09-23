/**
 * Target Dataverse environment for cross-environment table operations.
 * All table services route their CRUD calls through the Microsoft Dataverse
 * connector's "WithOrganization" operations against this environment instead
 * of the environment the Code App itself runs in.
 */
export const TARGET_ORGANIZATION_URL = 'https://org1cb63e1b.crm4.dynamics.com';
