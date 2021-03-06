import faunadb from "faunadb";
const q = faunadb.query;

export async function addSemester(client, schoolRef, semesterData) {
  const me = await client.query(q.Identity());
  return client
    .query(
      q.Create(q.Collection("semesters"), {
        data: {
          ...semesterData,
          school: schoolRef,
          owner: me,
        },
        permissions: {
          read: me,
          write: me,
        },
      })
    )
    .then((resp) => {
      if (resp) {
        return {
          ...resp.data,
          id: resp.ref.value.id,
          ref: resp.ref,
        };
      }
      return resp;
    })
    .catch((e) => e);
}

export function getAllSemesters(client) {
  return client
    .query(
      q.Map(q.Paginate(q.Match(q.Ref("indexes/all_semesters"))), (ref) =>
        q.Get(ref)
      )
    )
    .then((resp) => {
      if (resp.data) {
        const semesters = resp.data;
        return semesters.map((s) => {
          return {
            ...s.data,
            id: s.ref.value.id,
            ref: s.ref,
          };
        });
      }
      return [];
    })
    .catch((err) => err);
}
export function getSemestersForSchool(client, schoolID) {
  return client
    .query(q.Get(q.Ref(`collections/schools/${schoolID}`)))
    .then((school) => {
      return client
        .query(
          q.Map(
            q.Paginate(q.Match(q.Index("semesters_by_school"), school.ref)),
            (ref) => q.Get(ref)
          )
        )
        .then((resp) => {
          if (resp.data) {
            const semesters = resp.data;
            return semesters.map((s) => {
              return {
                ...s.data,
                id: s.ref.value.id,
                ref: s.ref,
              };
            });
          }
          return [];
        });
    })
    .catch((err) => err);
}

export function deleteSemester(client, semesterRef) {
  return client
    .query(
      q.Map(
        q.Paginate(q.Match(q.Index("classes_by_semester"), semesterRef)),
        q.Lambda("X", q.Delete(q.Select("ref", q.Get(q.Var("X")))))
      )
    )
    .then(() => {
      return client.query(q.Delete(semesterRef));
    })
    .catch((err) => err);
}

export function updateSemester(client, semesterID, newData) {
  return client
    .query(
      q.Update(q.Ref(q.Collection("semesters"), semesterID), {
        data: newData,
      })
    )
    .then((resp) => {
      if (resp) {
        return {
          ...resp.data,
          id: resp.ref.value.id,
          ref: resp.ref,
        };
      }
      return resp;
    })
    .catch((err) => err);
}
