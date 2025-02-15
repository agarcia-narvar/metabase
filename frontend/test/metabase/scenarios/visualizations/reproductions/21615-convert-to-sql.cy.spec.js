import { restore, visitQuestionAdhoc } from "__support__/e2e/cypress";
import { SAMPLE_DATABASE } from "__support__/e2e/cypress_sample_database";

const { ORDERS, ORDERS_ID } = SAMPLE_DATABASE;

describe("issue 21615", () => {
  beforeEach(() => {
    restore();
    cy.signInAsAdmin();
  });

  it("should not throw an error when converting a table question to sql (metabase#21615)", () => {
    visitQuestionAdhoc({
      display: "table",
      dataset_query: {
        type: "query",
        database: 1,
        query: {
          "source-table": ORDERS_ID,
          aggregation: [["count"]],
          breakout: [
            ["field", ORDERS.CREATED_AT, { "temporal-unit": "month" }],
          ],
        },
      },
    });

    cy.icon("notebook").click();
    cy.icon("sql").click();
    cy.button("Convert this question to SQL").click();

    cy.findByText("Visualization").should("be.visible");
    cy.findByText("Something went wrong").should("not.exist");
  });
});
