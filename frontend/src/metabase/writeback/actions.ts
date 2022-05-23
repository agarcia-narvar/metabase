import { MetabaseApi } from "metabase/services";
import Table from "metabase-lib/lib/metadata/Table";
import { runQuestionQuery } from "metabase/query_builder/actions/querying";
import { closeObjectDetail } from "metabase/query_builder/actions/object-detail";

export type DeleteRowPayload = {
  table: Table;
  id: number | string;
};

export const DELETE_ROW_FROM_OBJECT_DETAIL =
  "metabase/qb/DELETE_ROW_FROM_OBJECT_DETAIL";
export const deleteRowFromObjectDetail = (payload: DeleteRowPayload) => {
  return async (dispatch: any) => {
    const { table, id } = payload;
    const field = table.fields.find(field => field.isPK());
    if (!field) {
      throw new Error("Cannot delete row from table without a primary key");
    }

    const pk = field.isNumeric() && typeof id === "string" ? parseInt(id) : id;
    const result = await MetabaseApi.actions.deleteRow({
      type: "query",
      database: table.db_id,
      query: {
        "source-table": table.id,
        filter: ["=", field.reference(), pk],
      },
    });

    dispatch.action(DELETE_ROW_FROM_OBJECT_DETAIL, payload);
    if (result?.["rows-deleted"]?.length > 0) {
      dispatch(closeObjectDetail());
      dispatch(runQuestionQuery());
    }
  };
};
