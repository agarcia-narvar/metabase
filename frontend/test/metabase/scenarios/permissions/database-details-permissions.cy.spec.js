import {
  restore,
  modal,
  describeEE,
  assertPermissionForItem,
  modifyPermission,
} from "__support__/e2e/cypress";

const DATA_ACCESS_PERMISSION_INDEX = 0;
const DETAILS_PERMISSION_INDEX = 4;

describeEE(
  "scenarios > admin > permissions > database details permissions",
  () => {
    beforeEach(() => {
      restore();
      cy.signInAsAdmin();
    });

    it("allows database managers to see and edit database details but not to delete a database (metabase#22293)", () => {
      // As an admin, grant database details permissions to all users
      cy.visit("/admin/permissions/data/database/1");

      modifyPermission(
        "All Users",
        DATA_ACCESS_PERMISSION_INDEX,
        "Unrestricted",
      );
      modifyPermission("All Users", DETAILS_PERMISSION_INDEX, "Yes");

      cy.button("Save changes").click();

      modal().within(() => {
        cy.findByText("Save permissions?");
        cy.findByText("Are you sure you want to do this?");
        cy.button("Yes").click();
      });

      assertPermissionForItem("All Users", DETAILS_PERMISSION_INDEX, "Yes");

      // Normal user should now have the ability to manage databases
      cy.signInAsNormalUser();

      cy.visit("/");
      cy.icon("gear").click();
      cy.findByText("Admin settings")
        .should("be.visible")
        .click();

      cy.location("pathname").should("eq", "/admin/databases");

      cy.get("nav")
        .should("contain", "Databases")
        .and("not.contain", "Settings")
        .and("not.contain", "Data Model");

      cy.findByText("Sample Database").click();

      cy.get(".Actions")
        .should("contain", "Sync database schema now")
        .and("contain", "Re-scan field values now")
        .and("contain", "Discard saved field values")
        .and("not.contain", "Remove this database");

      cy.request({
        method: "DELETE",
        url: "/api/database/1",
        failOnStatusCode: false,
      }).then(({ status }) => {
        expect(status).to.eq(403);
      });
    });
  },
);
