import ts from "typescript";

function visitNodes(node: ts.Node, visit: (node: ts.Node) => void): void {
  const walk = (current: ts.Node) => {
    visit(current);
    ts.forEachChild(current, walk);
  };
  walk(node);
}

/** Collect reachable callRpc and .rpc invocations with string-literal RPC names from source. */
export function collectGovernedRpcInvocations(source: string, fileName = "module.ts"): Set<string> {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const invocations = new Set<string>();

  visitNodes(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || node.arguments.length === 0) return;
    const firstArg = node.arguments[0];
    if (!ts.isStringLiteral(firstArg) && !ts.isNoSubstitutionTemplateLiteral(firstArg)) return;

    const rpcName = firstArg.text;
    if (ts.isIdentifier(node.expression) && node.expression.text === "callRpc") {
      invocations.add(rpcName);
      return;
    }
    if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "rpc") {
      invocations.add(rpcName);
    }
  });

  return invocations;
}

/** Read `CORE_QUOTE_RPC_PREREQUISITES` from quote-contract source (single canonical set). */
export function readCoreQuoteRpcPrerequisites(quoteContractSource: string): readonly string[] {
  const sourceFile = ts.createSourceFile(
    "quote-contract.ts",
    quoteContractSource,
    ts.ScriptTarget.Latest,
    true
  );
  let prerequisites: string[] = [];

  visitNodes(sourceFile, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) return;
    if (node.name.text !== "CORE_QUOTE_RPC_PREREQUISITES" || !node.initializer) return;

    const initializer = ts.isAsExpression(node.initializer)
      ? node.initializer.expression
      : node.initializer;
    if (!ts.isArrayLiteralExpression(initializer)) return;

    prerequisites = initializer.elements
      .filter((element): element is ts.StringLiteral => ts.isStringLiteral(element))
      .map((element) => element.text);
  });

  if (prerequisites.length === 0) {
    throw new Error("CORE_QUOTE_RPC_PREREQUISITES could not be read from quote-contract.ts");
  }

  return prerequisites;
}

export function missingExecutableQuoteRpcs(
  quoteContractSource: string,
  quotesApiSource: string
): string[] {
  const required = readCoreQuoteRpcPrerequisites(quoteContractSource);
  const invoked = collectGovernedRpcInvocations(quotesApiSource, "quotes.ts");
  return required.filter((rpc) => !invoked.has(rpc));
}

/**
 * Certify the actual CheckoutScreen submit wrapper -> RPC binding.
 * AST traversal avoids comment matches and API-wide decoy RPCs; ambiguity fails closed.
 * This is source-route evidence only, not server-side financial authorization proof.
 */
export function resolveCheckoutDirectSubmitRpc(
  screenSource: string,
  checkoutApiSource: string
): "submit_customer_order_quoted_v1" | "submit_customer_order_v1" | null {
  const screen = ts.createSourceFile("CheckoutScreen.tsx", screenSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const api = ts.createSourceFile("checkout.ts", checkoutApiSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imported = new Set<string>();

  for (const statement of screen.statements) {
    if (!ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== "@/lib/api/checkout") continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const specifier of bindings.elements) {
      if (!specifier.propertyName) imported.add(specifier.name.text);
    }
  }

  const wrappersCalled = new Set<string>();
  visitNodes(screen, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    if (node.expression.text === "submitQuotedCustomerOrder" ||
        node.expression.text === "submitCustomerOrder") {
      wrappersCalled.add(node.expression.text);
    }
  });

  const directScreenRpcs = collectGovernedRpcInvocations(screenSource, "CheckoutScreen.tsx");
  if (directScreenRpcs.has("submit_customer_order_v1") ||
      directScreenRpcs.has("submit_customer_order_quoted_v1") ||
      wrappersCalled.size !== 1) return null;

  const [wrapper] = wrappersCalled;
  if (!imported.has(wrapper)) return null;
  const expectedRpc = wrapper === "submitQuotedCustomerOrder"
    ? "submit_customer_order_quoted_v1"
    : "submit_customer_order_v1";

  const definitions = api.statements.filter((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === wrapper &&
    Boolean(statement.body) &&
    Boolean(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
  );
  if (definitions.length !== 1 || !definitions[0].body) return null;
  const wrapperRpcs = collectGovernedRpcInvocations(definitions[0].body.getText(api), "checkout-wrapper.ts");
  return wrapperRpcs.size === 1 && wrapperRpcs.has(expectedRpc) ? expectedRpc : null;
}
