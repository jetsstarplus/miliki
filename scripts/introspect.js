const http = require('http');

function gqlQuery(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const req = http.request(
      { hostname: 'victor-personal', port: 8000, path: '/graphql', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      res => { let b = ''; res.on('data', d => b += d); res.on('end', () => resolve(JSON.parse(b))); }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Get RegisterInput fields
  const r1 = await gqlQuery(`{ __type(name: "RegisterInput") { inputFields { name type { name kind ofType { name kind } } } } }`);
  console.log('=== RegisterInput fields ===');
  console.log(JSON.stringify(r1.data.__type.inputFields.map(f => f.name)));

  // Get createCompany mutation args
  const r2 = await gqlQuery(`{ __type(name: "Mutation") { fields { name args { name type { name kind ofType { name kind } } } } } }`);
  const cc = r2.data.__type.fields.find(f => f.name === 'createCompany');
  console.log('=== createCompany args ===');
  console.log(JSON.stringify(cc, null, 2));

  // Get company type choices
  const r3 = await gqlQuery(`{ __type(name: "CompaniesCompanyCompanyTypeChoices") { enumValues { name } } }`);
  console.log('=== CompanyTypeChoices ===');
  console.log(JSON.stringify(r3.data.__type.enumValues.map(e => e.name)));

  // Get company status choices
  const r4 = await gqlQuery(`{ __type(name: "CompaniesCompanyStatusChoices") { enumValues { name } } }`);
  console.log('=== CompanyStatusChoices ===');
  console.log(JSON.stringify(r4.data.__type.enumValues.map(e => e.name)));

  // Get mutation fields
  const mutationResult = r2;
  console.log('=== MUTATIONS ===');
  console.log(JSON.stringify(mutationResult.data.__type.fields.map(f => f.name), null, 2));

  // Get RegisterInput fields
  const registerInput = await gqlQuery(`{
    __type(name: "RegisterInput") {
      inputFields { name type { name kind ofType { name kind } } }
    }
  }`);
  console.log('\n=== RegisterInput ===');
  console.log(JSON.stringify(registerInput.data.__type, null, 2));

  // Get ObtainJSONWebTokenInput (login)
  const loginInput = await gqlQuery(`{
    __type(name: "ObtainJSONWebTokenInput") {
      inputFields { name type { name kind ofType { name kind } } }
    }
  }`);
  console.log('\n=== ObtainJSONWebTokenInput (Login) ===');
  console.log(JSON.stringify(loginInput.data.__type, null, 2));

  // Get CompanyType fields
  const companyType = await gqlQuery(`{
    __type(name: "CompanyType") {
      fields { name type { name kind ofType { name kind } } }
    }
  }`);
  console.log('\n=== CompanyType ===');
  console.log(JSON.stringify(companyType.data.__type, null, 2));

  // Get CreateCompanyMutation
  const createCompany = await gqlQuery(`{
    __type(name: "CreateCompanyMutation") {
      fields { name type { name kind ofType { name kind } } }
    }
  }`);
  console.log('\n=== CreateCompanyMutation ===');
  console.log(JSON.stringify(createCompany.data.__type, null, 2));

  // Get UserNode fields
  const userNode = await gqlQuery(`{
    __type(name: "UserNode") {
      fields { name type { name kind ofType { name kind } } }
    }
  }`);
  console.log('\n=== UserNode ===');
  console.log(JSON.stringify(userNode.data.__type, null, 2));

  // Get RegisterPayload
  const registerPayload = await gqlQuery(`{
    __type(name: "RegisterPayload") {
      fields { name type { name kind ofType { name kind } } }
    }
  }`);
  console.log('\n=== RegisterPayload ===');
  console.log(JSON.stringify(registerPayload.data.__type, null, 2));

  // Get Query type fields
  const queryType = await gqlQuery(`{
    __type(name: "Query") {
      fields { name type { name kind ofType { name kind } } }
    }
  }`);
  console.log('\n=== Query Fields ===');
  console.log(JSON.stringify(queryType.data.__type.fields.map(f => f.name), null, 2));

  // Get full createCompany args
  const ccFull = await gqlQuery(`{ __type(name: "Mutation") { fields { name args { name type { name kind ofType { name kind } } } } } }`);
  const ccArgs = ccFull.data.__type.fields.find(f => f.name === 'createCompany');
  console.log('\n=== createCompany full args ===');
  console.log(JSON.stringify(ccArgs.args.map(a => a.name)));

  // Get ObtainJSONWebTokenPayload
  const loginPayload = await gqlQuery(`{
    __type(name: "ObtainJSONWebTokenPayload") {
      fields { name type { name kind ofType { name kind } } }
    }
  }`);
  console.log('\n=== ObtainJSONWebTokenPayload ===');
  console.log(JSON.stringify(loginPayload.data.__type, null, 2));
}

main().catch(console.error);
